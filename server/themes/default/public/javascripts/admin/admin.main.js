angular.module('app', ['ngRoute', 'ngResource', 'ngSanitize', 'angular-uuid', 'ui.bootstrap', 'color.picker', 'ui.validate', 'textAngular', 'ngFileSaver'])
    // Service
    .factory('Api', ['$resource',
     function($resource) {
      return {
        Aliases: $resource('/api/capcodes/', null, {
          'delete': { method:'DELETE', hasBody: true }
        }),
        AliasDetail: $resource('/api/capcodes/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false },
          'delete': { method: 'DELETE', isArray: false}
        }),
        Settings: $resource('/admin/settingsData', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasDupeCheck: $resource('/api/capcodeCheck/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        AliasRefresh: $resource('/api/capcodeRefresh', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasExport: $resource('/api/capcodeExport', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasImport: $resource('/api/capcodeImport', null, {
          'post': { method:'POST', isArray: false }
        }),
        Users: $resource('/api/user', null, {
        }),
        UserDetail: $resource('/api/user/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        UsernameCheck: $resource('/api/userCheck/username/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        UseremailCheck: $resource('/api/userCheck/email/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
      };
    }])

    // Controller
    .controller('AliasController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', 'FileSaver', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, FileSaver) {
      $scope.loading = true;
      $scope.alertMessage = {};
      Api.Aliases.query(null, function(results) {
        $scope.aliases = results;
        $scope.page = 'aliases';
        $scope.loading = false;
      });
      Api.Settings.get(null, function(results) {
        if (results) {
          if (results.settings.database && results.settings.database.aliasRefreshRequired == 1) {
            $scope.aliasRefreshRequired = 1;
            $scope.alertMessage.text = 'Alias refresh required!';
            $scope.alertMessage.type = 'alert-warning';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }
      });

      $scope.aliasRefresh = function () {
        $scope.loading = true;
        $scope.alertMessage = {};
        Api.AliasRefresh.post(null, null).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias refresh complete!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 0;
          } else {
            $scope.alertMessage.text = 'Error refreshing aliases: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error refreshing aliases: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      $scope.aliasExport = function () {
        $scope.loading = true;
        $scope.alertMessage = {};
        Api.AliasExport.post(null, null).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.data) {
            var blob = new Blob([response.data], {type: "text/csv;charset=utf-8"});
            FileSaver.saveAs(blob, "export.csv");
            $scope.alertMessage.text = 'Alias export complete!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () {
              $scope.alertMessage.show = false;
            }, 3000);
          } else {
            $scope.alertMessage.text = 'Error exporting aliases: ' + response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () {
              $scope.alertMessage.show = false;
            }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error exporting aliases: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      $scope.aliasImport = function () {
        var modalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Impot Aliases</h5></div>';
        var messages = `<p>Available Columns: address, alias, agency, color, icon, ignore, pluginconf</p>
                        <p>Required columns are "address" and "alias", all others are optional.</p>`;
        modalHtml += '<div class="modal-body"><p><input type="file" id="importcsv"/></p><p>CSV file to be imported</p>' + messages + '</div>';
        modalHtml += '<div class="modal-footer"><button class="btn btn-success" ng-click="confirmImport()">Import</button><button class="btn btn-danger" ng-click="cancelImport()">Cancel</button></div>';
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ImportController,

        });
        modalInstance.result.then(function () {
          $scope.aliasImportConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.aliasImportConfirmed = function () {
        $scope.loading = true;
        var filename = document.getElementById("importcsv");
        if (filename.value.length < 1) {
          // noidea i stole this code.
        } else {
          var file = filename.files[0];
          console.log(file)
          var fileSize = 0;
          if (filename.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
              var rows = e.target.result.split("\n");
              Api.AliasImport.post(rows).$promise.then(function (response) {
                console.log(response)
                $scope.loading = false;
                $scope.results = response.results
                var resultModalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Import Results</h5></div>';
                resultModalHtml += `<div class="modal-body">  
                    <table class="table table-striped">
                       <thead>
                       <tr>
                          <th>Address</th>
                          <th>Alias</th>
                          <th>Result</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr ng-repeat="result in results">
                          <td>{{ result.address }}</td>
                          <td>{{ result.alias }}</td>
                          <td>{{ result.result }}</td>
                        </tr>
                        </tbody>
                      </table>
                      </div>`
                resultModalHtml += '<div class="modal-footer"><button class="btn btn-success" ng-click="okImport()">OK</button></div>';
                var modalInstance = $uibModal.open({
                  template: resultModalHtml,
                  controller: ImportController,
                  scope: $scope
                });

              }, function (response) {
                $scope.loading = false;
                console.log(response)
                var resultModalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Import Failed</h5></div>';
                resultModalHtml += `<div class="modal-body">  
                    <p>Failed to Parse CSV file, please check the file and try again!</p>
                    `
                resultModalHtml += '<div class="modal-footer"><button class="btn btn-success" ng-click="okfailedImport()">OK</button></div>';
                var modalInstance = $uibModal.open({
                  template: resultModalHtml,
                  controller: ImportController,
                  scope: $scope
                });
              })
            }
            reader.readAsText(filename.files[0]);
          }
          return false; //no idea what this does, was also in the code i stole and it doesn't work without it.
        }
      };

      $scope.aliasDetail = function (alias_id) {
        $location.url('/aliases/' + alias_id);
      };

      $scope.aliasMessages = function (alias_id) {
        $location.url('../../?alias=' + alias_id);
      }

      $scope.aliasSelected = function () {
        if ($scope.aliases) {
          var trues = $filter("filter")($scope.aliases, {
            selected: true
          });
          return trues.length;
        }
      };

      $scope.aliasDelete = function () {
        var numSelected = $scope.aliasSelected();
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete aliases</h5></div>';
        var message   =  '<p>Are you sure you want to delete these aliases?</p><p>Aliases cannot be restored after saving.</p><p><strong>'+numSelected+' aliases selected for deletion.</strong></p>';
            modalHtml += '<div class="modal-body">' + message + '</div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';

        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });

        modalInstance.result.then(function() {
          $scope.aliasDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.aliasDeleteConfirmed = function () {
        var deleteList = [];
        $scope.loading = true;
        $scope.selectedAll = false;
        angular.forEach($scope.aliases, function(selected){
            if(selected.selected){
                deleteList.push(selected.id);
            }
        });
        var data = {'deleteList': deleteList};
        console.log(data);
        Api.AliasDetail.post({id: 'deleteMultiple' }, data).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 1;
            $location.url('/aliases/');
          } else {
            $scope.alertMessage.text = 'Error deleting alias: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting alias: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      var ConfirmController = function ($scope, $uibModalInstance) {
        $scope.confirmDelete = function () {
          $uibModalInstance.close();
        };

        $scope.cancelDelete = function () {
          $uibModalInstance.dismiss('cancel');
        };
      };

      var ImportController = function ($scope, $uibModalInstance) {
        $scope.confirmImport = function () {
          $uibModalInstance.close();
        };
        $scope.cancelImport = function () {
          $uibModalInstance.dismiss('cancel');
        };
        $scope.okImport = function () {
          $uibModalInstance.close();
          $scope.aliasRefreshRequired = 1
          $scope.alertMessage.text = 'Alias refresh required!';
          $scope.alertMessage.type = 'alert-warning';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $location.url('/aliases/');
        }
        $scope.okfailedImport = function () {
          $uibModalInstance.close();
        }
      };
    }])

    .controller('UserController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', 'FileSaver', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, FileSaver) {
      $scope.loading = true;
      $scope.alertMessage = {};
      Api.Users.query(null, function(results) {
        $scope.users = results;
        $scope.page = 'users';
        $scope.loading = false;
      });
      
      $scope.userDetail = function(id) {
          $location.url('/users/'+id);
      };
 
     $scope.userSelected = function() {
        if ($scope.users) {
          var trues = $filter("filter")($scope.users, {
              selected: true
          });
          return trues.length;
        }
      };
      
      $scope.userDelete = function () {
        var numSelected = $scope.userSelected();
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete Users</h5></div>';
        var message   =  '<p>Are you sure you want to delete these users?</p><p>Users cannot be restored after saving.</p><p><strong>'+numSelected+' users selected for deletion.</strong></p>';
            modalHtml += '<div class="modal-body">' + message + '</div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
 
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
    
        modalInstance.result.then(function() {
          $scope.userDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };
      
      $scope.userDeleteConfirmed = function () {
        var deleteList = [];
        $scope.loading = true;
        $scope.selectedAll = false;
        angular.forEach($scope.users, function (selected) {
          if (selected.selected) {
            if (selected.id != 1) {
              deleteList.push(selected.id);
            }
          }
        });
        var data = {'deleteList': deleteList};
        console.log(data);
        Api.UserDetail.post({id: 'deleteMultiple' }, data).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Users deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 1;
            $location.url('/users/');
          } else {
            $scope.alertMessage.text = 'Error deleting users: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting users: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      var ConfirmController = function ($scope, $uibModalInstance) {
        $scope.confirmDelete = function () {
          $uibModalInstance.close();
        };

        $scope.cancelDelete = function () {
          $uibModalInstance.dismiss('cancel');
        };
      };
    }])

    .controller('UserDetailController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
      $scope.page = 'userDetail';
      $scope.alertMessage = {};

      // controls the form validation on the username field
      $scope.checkUsername = function() {
        $scope.userLoading = true;
        if ($scope.user.username) {
          Api.UsernameCheck.get({id: $scope.user.username }, function(results) {
            if (results.username) {
              $scope.userLoading = false;
              if (results.username == $scope.user.originalUsername) {
                $scope.existingUser = false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingUsername = true;
                return true;
              }
            } else {
              $scope.userLoading = false;
              $scope.existingUsername = false;
              return false;
            }
          });
        } else {
          $scope.userLoading = false;
          $scope.existingUsername = false;
          return false;
        }
      };

      $scope.checkEmail = function() {
        $scope.userLoading = true;
        if ($scope.user.email) {
          Api.UseremailCheck.get({id: $scope.user.email }, function(results) {
            if (results.email) {
              $scope.userLoading = false;
              if (results.email == $scope.user.originalEmail) {
                $scope.existingEmail= false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingEmail = true;
                return true;
              }
            } else {
              $scope.userLoading = false;
              $scope.existingEmail = false;
              return false;
            }
          });
        } else {
          $scope.userLoading = false;
          $scope.existingEmail = false;
          return false;
        }
      };

      $scope.userSubmit = function() {
        if ($scope.existingUsername) {
          $scope.alertMessage.text = 'Error saving user: User with this address already exists.';
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
        } else if ($scope.existingEmail) {
          $scope.alertMessage.text = 'Error saving user: User with this email already exists.';
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
        } else {
          $scope.loading = true;
          var id;
          if ($scope.user.id) {
            id = $routeParams.id;
          } else {
            id = "new";
          }
          Api.UserDetail.save({ id: id }, $scope.user).$promise.then(function (response) {
            console.log(response);
            if (response.status == 'ok') {
              $scope.alertMessage.text = 'User saved!';
              $scope.alertMessage.type = 'alert-success';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
              if ($scope.isNew) {
                $location.url('/users/' + response.id);
              }
            } else {
              $scope.alertMessage.text = 'Error saving user: ' + response;
              $scope.alertMessage.type = 'alert-danger';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
            }
          }, function (response) {
            console.log(response);
            $scope.alertMessage.text = 'Error saving user: ' + response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          });
        }
      };
      
      $scope.userDelete = function () {
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete User</h5></div>';
            modalHtml += '<div class="modal-body"><p>Are you sure you want to delete this user?</p><p>Users cannot be restored after deletion.</p></div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
        modalInstance.result.then(function() {
          $scope.userDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };
      
      $scope.userDeleteConfirmed = function () {
        console.log('Deleting user '+$scope.user.username);
        $scope.loading = true;
        Api.UserDetail.delete({id: $routeParams.id }, $scope.user).$promise.then(function (response) {
          console.log(response);
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'User deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
            $location.url('/users/');
          } else {
            $scope.alertMessage.text = 'Error deleting user: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting user: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };

      $scope.userReset = function () {
        var resetModalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Password Reset</h5></div>';
        resetModalHtml += `<div class="modal-body">  
                <div class="row" style="padding-top: 10px">
                <div class="col-xs-12">
                  <div class="col-xs-12 col-md-offset-2 col-md-8">
                    <form name="form">
                      <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" class="form-control" id="user.password" name="user.newpassword" ng-model="user.newpassword" autofocus=true
                          required>
                      </div>
                      <div class="form-group">
                        <label for="confirm_password">Confirm Password:</label>
                        <input type="password" class="form-control" id="confirm_password" name="confirm_password"
                          ng-model="confirm_password" required ui-validate=" '$value==user.newpassword' " ui-validate-watch=" 'user.newpassword' ">
                        <span class="text-danger" ng-show='form.confirm_password.$error.validator'>Passwords do not match!</span>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              </div>`
        resetModalHtml += '<button ng-disabled="form.confirm_password.$error.validator" ng-click="confirmReset()" class="btn btn-default">Ok</button><button class="btn btn-primary" ng-click="cancelReset()">Cancel</button></div>';


        var modalInstance = $uibModal.open({
          template: resetModalHtml,
          controller: ConfirmController,
          scope: $scope,
        });
    
        modalInstance.result.then(function(result) {
          $scope.userResetConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.userResetConfirmed = function () {
        var id = $routeParams.id
        Api.UserDetail.save({ id: id }, $scope.user).$promise.then(function (response) {
          console.log(response);
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'User saved!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $scope.user.newpassword = null;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
            if ($scope.isNew) {
              $location.url('/users/' + response.id);
            }
          } else {
            $scope.alertMessage.text = 'Error saving user: ' + response;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          }
        }, function (response) {
          console.log(response);
          $scope.alertMessage.text = 'Error saving user: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;
        });
      }
      
      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
        $scope.confirmReset = function () {
          $uibModalInstance.close();
        };
        $scope.cancelReset = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
      
      // get data on load
      $scope.loading = true;
      Api.UserDetail.get({ id: $routeParams.id }, function (results) {
        $scope.user = results;
        $scope.userLoading = false;
        $scope.existingUsername = false;
        $scope.existingEmail = false;
        $scope.loading = false;

        if (results.username) {
          $scope.user.originalUsername = results.username;
          $scope.user.originalEmail = results.email;
          $scope.isNew = false;
          $scope.user.lastlogondate = new Date(results.lastlogondate).toLocaleString()
          console.log(results)
        } else {
          $scope.user.username = $routeParams.username || '';
          $scope.user.originalUsername = $routeParams.username || '';
          $scope.isNew = true;
          console.log(results);
        }
      });
    }])
    
    .controller('AliasDetailCtrl', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
      $scope.page = 'aliasDetail';
      $scope.alertMessage = {};
      $scope.colorOptions = {
          required: true,
          inputClass: 'form-control',
          id: 'alias.color',
          name: 'alias.color',
          format: 'hexString',
          saturation: true,
          alpha: false
      };
      $scope.newButton = function(address) {
          $location.url('/aliases/'+address);
      };

      $scope.aliasRefresh = function () {
        $scope.loading = true;
        $scope.alertMessage = {};
        Api.AliasRefresh.post(null, null).$promise.then(function (response) {
          //console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias refresh complete!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 0;
          } else {
            $scope.alertMessage.text = 'Error refreshing aliases: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error refreshing aliases: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      $scope.aliasLoad = function() {
        $scope.loading = true;
        Api.AliasDetail.get({id: $routeParams.id }, function(results) {
          $scope.alias = results;
          $scope.aliasLoading = false;
          $scope.existingAddress = false;
          $scope.loading = false;

          if (results.pluginconf) {
            $scope.plugins.forEach(plugin => {
              if (!$scope.alias.pluginconf[plugin.name]) {
                $scope.alias.pluginconf[plugin.name] = {};
              }
            });
          } else {
            // populate pluginconf
            $scope.alias.pluginconf = {};
            $scope.plugins.forEach(plugin => {
              $scope.alias.pluginconf[plugin.name] = {};
            });
          }

          if (results.address) {
            $scope.alias.originalAddress = results.address;
            $scope.isNew = false;
            //console.log(results);
          } else {
            $scope.alias.address = $routeParams.address || '';
            $scope.alias.originalAddress = $routeParams.address || '';
            $scope.isNew = true;
            //console.log(results);
          }
        });
      };
      // controls the form validation on the address field
      $scope.checkAddress = function() {
        $scope.aliasLoading = true;
        if ($scope.alias.address) {
          Api.AliasDupeCheck.get({id: $scope.alias.address }, function(results) {
            if (results.address) {
              $scope.aliasLoading = false;
              if (results.address == $scope.alias.originalAddress) {
                $scope.existingAddress = false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingAddress = true;
                return true;
              }
            } else {
              $scope.aliasLoading = false;
              $scope.existingAddress = false;
              return false;
            }
          });
        } else {
          $scope.aliasLoading = false;
          $scope.existingAddress = false;
          return false;
        }
      };

      $scope.aliasSubmit = function() {
        if ($scope.existingAddress) {
          $scope.alertMessage.text = 'Error saving alias: Alias with this address already exists.';
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
        } else {
          $scope.loading = true;
          var id;
          if ($scope.alias.id) {
            id = $routeParams.id;
          } else {
            id = "new";
          }
          Api.AliasDetail.save({ id: id }, $scope.alias).$promise.then(function (response) {
            console.log(response);
            if (response.status == 'ok') {
              $scope.alertMessage.text = 'Alias saved!';
              $scope.alertMessage.type = 'alert-success';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
              if ($scope.isNew) {
                $scope.aliasRefreshRequired = 1;
                $location.url('/aliases/' + response.id);
              }
            } else {
              $scope.alertMessage.text = 'Error saving alias: ' + response;
              $scope.alertMessage.type = 'alert-danger';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
            }
          }, function (response) {
            console.log(response);
            $scope.alertMessage.text = 'Error saving alias: ' + response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          });
        }
      };

      $scope.aliasDelete = function () {
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete Alias</h5></div>';
            modalHtml += '<div class="modal-body"><p>Are you sure you want to delete this alias?</p><p>Aliases cannot be restored after deletion.</p></div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
        modalInstance.result.then(function() {
          $scope.aliasDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.aliasDeleteConfirmed = function () {
        console.log('Deleting alias '+$scope.alias.address);
        $scope.loading = true;
        Api.AliasDetail.delete({id: $routeParams.id }, $scope.alias).$promise.then(function (response) {
          console.log(response);
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
            $location.url('/aliases/');
          } else {
            $scope.alertMessage.text = 'Error deleting alias: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting alias: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
      // get data on load
      Api.Settings.get(null, function(results) {
        if (results) {
          if (results.database && results.database.aliasRefreshRequired == 1) {
            $scope.aliasRefreshRequired = 1;
          }
          $scope.settings = results.settings;
          $scope.plugins = results.plugins;
          $scope.themes = results.themes;
        }
        $scope.aliasLoad();
      });
    }])
 
    // needs cleanup
    .controller('SettingsController', ['$scope', '$routeParams', 'Api', 'uuid', '$uibModal', '$filter', '$timeout', '$sanitize', function ($scope, $routeParams, Api, uuid, $uibModal, $filter, $timeout, $sanitize) {
      $scope.alertMessage = {};
      Api.Settings.get(null, function(results) {
        if (!results.settings.messages.replaceText)
          results.settings.messages.replaceText = [{}];
        if (!results.settings.auth.keys)
          results.settings.auth.keys = [{}];
        $scope.settings = results.settings;
        $scope.plugins = results.plugins;
        $scope.themes = results.themes;
      });

      $scope.settingsSubmit = function() {
        $scope.loading = true;
        Api.Settings.save(null, $scope.settings).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Settings saved!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          } else {
            $scope.alertMessage.text = 'Error saving settings: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error saving settings: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      $scope.page = 'settings';

      // this function generates the long API keys
      // gets two 36 char UUIDs, removes the dashes, base36 encodes them, then joins together half of each string
      // for increased key length, uncomment the h2/k2 lines, and swap the kf lines
      $scope.generateKey = function(index) {
        var hash = uuid.v4().replace(/-/g,"");
        var hash2 = uuid.v4().replace(/-/g,"");
        var h1 = hash.slice(0, 15);
      //  var h2 = hash.slice(16, -1);
        var h3 = hash2.slice(0, 15);
        var k1 = parseInt(h1, 16).toString(36);
      //  var k2 = parseInt(h2, 16).toString(36);
        var k3 = parseInt(h3, 16).toString(36);
      //  var kf = k1+k2+k3;
        var kf = k1+k3;
        var key = kf.toUpperCase();
        if (index == 'sessionSecret') {
          $scope.settings.global.sessionSecret = key;
        } else {
          $scope.settings.auth.keys[index].key = key;
        }
      };

      $scope.showPassword = false;

      $scope.toggleShowPassword = function() {
        $scope.showPassword = !$scope.showPassword;
      }

      $scope.addKey = function () {
        $scope.settings.auth.keys.push({
          'name': "",
          'key': ""
        });
      };

      $scope.addMatch = function () {
        $scope.settings.messages.replaceText.push({
          'match': "",
          'replace': ""
        });
      };

      $scope.keySelected = function() {
        if ($scope.settings && $scope.settings.auth) {
          var trues = $filter("filter")($scope.settings.auth.keys, {
              selected: true
          });
          return trues.length;
        }
      };

      $scope.matchSelected = function() {
        if ($scope.settings && $scope.settings.messages) {
          var trues = $filter("filter")($scope.settings.messages.replaceText, {
              selected: true
          });
          return trues.length;
        }
      };

      $scope.removeKey = function () {
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Remove API Keys</h5></div>';
            modalHtml += '<div class="modal-body"><p>Are you sure you want to delete these keys?</p><p>Keys cannot be restored after saving.</p></div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';

        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });

        modalInstance.result.then(function() {
          $scope.removeKeyConfirmed();
        }, function () {
        });
      };

      $scope.removeKeyConfirmed = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.auth.keys, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.auth.keys = newDataList;
      };

      $scope.removeMatch = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.messages.replaceText, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.messages.replaceText = newDataList;
      };

      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
    }])

    .controller('AdminController', ['$scope', '$routeParams', 'Api', function ($scope, $routeParams, Api) {
      $scope.page = 'admin';
    }])

    // Routes
    .config(['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
      $routeProvider
        .when('/', {
          templateUrl: '/templates/admin/admin.html',
          controller: 'AdminController'
        })
        .when('/aliases', {
          templateUrl: '/templates/admin/aliases.html',
          controller: 'AliasController'
        })
        .when('/users', {
          templateUrl: '/templates/admin/users.html',
          controller: 'UserController'
        })
        .when('/users/:id', {
          templateUrl: '/templates/admin/userDetails.html',
          controller: 'UserDetailController'
        })
        .when('/settings', {
          templateUrl: '/templates/admin/settings.html',
          controller: 'SettingsController'
        })
        .when('/aliases/:id', {
          templateUrl: '/templates/admin/aliasDetails.html',
          controller: 'AliasDetailCtrl'
       });
      $httpProvider.defaults.headers.delete = { "Content-Type": "application/json;charset=utf-8" };
      $httpProvider.interceptors.push(function($q, $location) {
        return {
          response: function(response) {
            return response;
          },
          responseError: function(response) {
            if (response.status === 401)
              $location.absUrl('/login');
            return $q.reject(response);
          }
        };
      });
      $locationProvider.html5Mode({ enabled: true, requireBase: false, rewriteLinks: true});
    }]);
