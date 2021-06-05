#requires -Module pssqlite
<#
.SYNOPSIS
    Migrate messages from a pagermon Sqlite database to another pagermon server instance.
.DESCRIPTION
    This script reads the pagermon messages from an sqlite database and sends them to a pagermon server instance.
    Script can be run multiple times from the same db.
    Journal file is used to keep track of which messages were migrated.
.NOTES
    This script does not migrate configuration, users, etc.
#>

[CmdletBinding()]
param (
    # Pagermon Server uri
    [Parameter(Mandatory)]
    [uri]
    $Uri,
    # Pagermon API Key
    [Parameter(Mandatory)]
    [string]
    $ApiKey,
    # Path to the Sqlite database ".db" file
    [Parameter(Mandatory)]
    [string]
    $DbPath
)

#region Functions and classes

class message {
    [int]$Id
    [string]$Address
    [string]$Message
    [string]$Source
    [int]$Timestamp
    [int]$Alias_Id
    messages([object]$input) {
        $this.Id = $input.Id
        $this.Address = $input.Address
        $this.Message = $input.Message
        $this.Source = $input.Source
        $this.Timestamp = $input.Timestamp
        $this.Alias_Id = $input.Alias_Id
    }
}

function New-PagerMonMessage {
    #send a message to pagermon.
    param (
        [message]$Message,
        [UriBuilder]$Uri,
        [string]$apikey
    )

    $Uri.Path = "/api/messages"
    $data = @{
        address  = $message.Address
        message  = $message.Message
        datetime = $Message.Timestamp
        source   = $Message.Source
    }
    $json = $data | ConvertTo-Json
    Invoke-RestMethod $Uri.Uri -Method post -Body $json -Header @{"apikey" = $apikey } -ContentType 'application/json' -UserAgent 'PagerMon psclient.ps1'
}

function resumeFrom ($indexPath) {
    #journaling helper
    [int]$output = Get-Content $indexPath -ErrorAction Stop
    if ($null -eq $output) {
        [int]$output = 1
    }
    Write-Output $output
}
#endregion

$GetHighestId = @"
SELECT Id
FROM messages
ORDER BY Id Desc
limit 1
"@
$DbConnection = New-SQLiteConnection -DataSource $DbPath -ErrorAction Stop
$maxRows = Invoke-SqliteQuery -SQLiteConnection $DbConnection -Query $GetHighestId -ErrorAction Stop

$indexPath = "$PSScriptRoot\index.txt"
if (! (Test-Path -Path $indexPath)) {
    $null | Out-File -FilePath $indexPath
}

for ($i = resumeFrom $indexPath; $i -lt $maxRows.Id + 1; $i++) {
    Write-Progress -Activity "Inserting Message" -Status "Message $i of $($maxRows.id) $($i / $maxRows.Id * 100)% Complete: " -PercentComplete ($i / $maxRows.Id * 100)
    
    #store the journal
    $i | Out-File -FilePath $indexPath -Force
    #get the next message from the database using the Id number
    $query = @"
    SELECT *
    FROM messages
    where Id = $i
"@
    [message]$message = Invoke-SqliteQuery -SQLiteConnection $DbConnection -Query $query
    if (($i -eq 0) -and ($null -eq $message)) {
        continue
    }
    #crap retry logic, written to deal with a crappy internet connection and a server that dies under too much load.
    if ($message) {
        $response = New-PagerMonMessage -Uri $Uri -ApiKey $ApiKey -Message $message
        while (!$response) {
            Write-Host "No response from server. Sleeping 30 seconds before trying again." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
            $response = New-PagerMonMessage -Uri $Uri -ApiKey $ApiKey -Message $message
        }
    }
}
