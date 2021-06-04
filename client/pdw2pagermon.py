# A program made by Shane (Shaggs) Rees to use PDW's email function into python.
""" To get Started
Options -> SMTP / email settings
Setting set to all messages
SMTP Host 127.0.0.1
Port 8826
To can be set as anything 
From can be set as anything

Mail options select
Address, Time, Date, Bitrate, Message

Notification set to messages 
"""
import asyncore
from datetime import datetime
import email
from clint.textui import puts, colored
import time
import smtpd
import requests
frag = " "
def apost(flexcode, msg, when):
		headers = {
			'X-Requested-With': 'XMLHttpRequest',
			'apikey': "", #pagermon APIKey
			'User-Agent': 'PagerMon pdw2pagermon.py',
		}
		params = {
			"address": flexcode,
			"message": msg,
			"datetime": when,
			"source": "",
			}
		requests.post('http://Your IP Address Here/api/messages', data=params, headers=headers)
class CustomSMTPServer(smtpd.SMTPServer):

	def process_message(self, peer, mailfrom, rcpttos, data, **kwargs):
		mime_message = email.message_from_bytes(data)
		message = mime_message.get_payload()
		flexcode, a, b, bitrate, msg = message.split(' ',4)
		when = int(time.time())
		flexcode = "00"+flexcode
		msg = msg.strip()
		bitrate = str(bitrate)
		if bitrate == "1600":
				self.frag = msg 
				puts(colored.yellow(flexcode), newline=False)
				puts(" [", newline=False)
				puts(colored.green(when), newline=False)
				puts("] ", newline=False)
				puts(msg)
				apost(flexcode, msg, when)
		elif bitrate == "1601":
			msg = self.frag + msg
			puts(colored.yellow(flexcode), newline=False)
			puts(" [", newline=False)
			puts(colored.green(when), newline=False)
			puts("] ", newline=False)
			puts(msg)
			apost(flexcode, msg, when)
		return

server = CustomSMTPServer(('127.0.0.1', 8826), None)

asyncore.loop()
