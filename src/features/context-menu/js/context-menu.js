(function () {
  'use strict';

  function groupBy(obj, iteratee, context) {
    var result = {};
    //iteratee = cb(iteratee, context);
    angular.forEach(obj, function(value, index) {
      var key = iteratee(value, index, obj);
      if (key in result){
        result[key].push(value);
      } else {
        result[key] = [value];
      }
    });
    return result;
  }


  /**
   * @ngdoc overview
   * @name ui.grid.contextMenu
   * @description
   *
   * # ui.grid.contextMenu
   *
   * <div class="alert alert-warning" role="alert"><strong>Alpha</strong> This feature is in development. There will almost certainly be breaking api changes, or there are major outstanding bugs.</div>
   *
   * This module provides grid cell/row context menu capability to ui.grid.
   * <br/>
   * <br/>
   *
   * <div doc-module-components="ui.grid.contextMenu"></div>
   */

  var module = angular.module('ui.grid.contextMenu', ['ui.grid']);

  /**
   *  @ngdoc service
   *  @name ui.grid.contextMenu.service:uiGridContextMenuService
   *
   *  @description Services for the context menu feature
   */
  module.service('uiGridContextMenuService', ['$compile', '$timeout',
    function($compile, $timeout){

      var self = this;

      /**
       * @param {ui.grid.GridOptions} gridOptions
       */
      this.defaultGridOptions = function(gridOptions){
        gridOptions.enableContextMenu = gridOptions.enableContextMenu !== false;
        gridOptions.alignContextMenuToGrid = gridOptions.alignContextMenuToGrid !== false;
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {ui.grid.MenuItemOptions} menuItem
       */
      this.addMenuItem = function(grid, menuItem){
        if(grid.contextMenu.menuItems.indexOf(menuItem) !== -1){
          return;
        }

        if(!angular.isFunction(menuItem.shown)){
          menuItem.shown = function(){return true;};
        }

        if(!angular.isFunction(menuItem.active)){
          menuItem.active = function(){return true;};
        }

        grid.contextMenu.menuItems.push(menuItem);
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {Array} menuItems
       */
      this.addMenuItems = function(grid, menuItems){
        angular.forEach(menuItems, function(menuItem){
          self.addMenuItem(grid, menuItem);
        });
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {ui.grid.MenuItemOptions} menuItem
       */
      this.removeMenuItem = function(grid, menuItem){
        var index = grid.contextMenu.menuItems.indexOf(menuItem);
        if(index !== -1){
          grid.contextMenu.menuItems.splice(index, 1);
        }
      };

      /**
       * @param {ui.grid.Grid} grid
       */
      this.removeAllMenuItems = function(grid){
        grid.contextMenu.menuItems.length = 0;
      };

      /**
       * @param {ui.grid.Grid} grid
       * @returns {Array}
       */
      this.getAllMenuItems = function(grid){
        return grid.contextMenu.menuItems;
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {ui.grid.Column} col
       * @param {ui.grid.Row} row
       * @returns {boolean}
       */
      this.hasMenuItemsForCell = function(grid, col, row){
        var cellMenuItems = self.getAllMenuItems(grid).filter(function(menuItem){
          return angular.isFunction(menuItem.shown) ? menuItem.shown(grid, col, row) : true;
        });

        return !!cellMenuItems.length;
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {ui.grid.Column} col
       * @param {ui.grid.Row} row
       * @returns {boolean}
       */
      this.isMenuEnabledForCell = function(grid, col, row){
        return grid.options.enableContextMenu !== false &&
          col.colDef.enableContextMenu !== false &&
          row.enableContextMenu !== false &&
          self.hasMenuItemsForCell(grid, col, row);
      };

      /**
       * @param {Event} evt
       * @param {ui.grid.Grid} grid
       * @param {angular.JQLite} cellElement
       */
      this.repositionMenu = function(evt, grid, cellElement) {
        var menuElement = grid.element.find('[ui-grid-context-menu-popup] .ui-grid-menu');
        var gridPosition = grid.element[0].getBoundingClientRect();
        var cellPosition = cellElement[0].getBoundingClientRect();

        // TODO: implement
        //if(!grid.options.alignContextMenuToGrid){
        //
        //}

        menuElement.css({
          top: (cellPosition.top - gridPosition.top + 2) + 'px',
          left: (cellPosition.left - gridPosition.left - 10) + 'px'
        });
      };

      /**
       * @param {Event} evt
       * @param {ui.grid.Grid} grid
       * @param {ui.grid.Column} col
       * @param {ui.grid.Row} row
       * @param {angular.JQLite} cellElement
       */
      this.showMenu = function(evt, grid, col, row, cellElement) {
        var menuScope = grid.contextMenu.menuScope;

        if(menuScope.menuShown && col === menuScope.col && row === menuScope.row){
          return;
        }

        if(menuScope.menuShown){
          self.hideMenu(grid, true);
        }

        if(grid.api.rowFocus){
          grid.api.rowFocus.focusRow(row.entity);
        }

        self.repositionMenu(evt, grid, cellElement);

        $timeout(function(){
          // Swap context menu to this cell
          menuScope.col = col;
          menuScope.row = row;
          menuScope.menuShown = true;
          grid.api.contextMenu.raise.show(grid, row, col);
        });
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {boolean=} quiet
       */
      this.hideMenu = function(grid, quiet) {
        var menuScope = grid.contextMenu.menuScope;

        if(!menuScope.menuShown){
          return;
        }

        menuScope.menuShown = false;
        menuScope.col = null;
        menuScope.row = null;

        if(!quiet){
          grid.api.contextMenu.raise.hide();
        }
      };

      /**
       * @param {ui.grid.Grid} grid
       * @param {angular.JQLite} gridElement
       */
      this.initializeGrid = function(grid, gridElement){
        self.defaultGridOptions(grid.options);

        /** @type {angular.Scope} */
        var menuScope = grid.appScope.$new();
        menuScope.grid = grid;
        menuScope.col = null;
        menuScope.row = null;
        menuScope.menuShown = false;

        grid.contextMenu = {};
        grid.contextMenu.menuItems = [];
        grid.contextMenu.menuScope = menuScope;

        if(grid.options.contextMenuCustomItems){
          self.addMenuItems(grid, grid.options.contextMenuCustomItems);
        }

        $compile('<div ui-grid-context-menu-popup></div>')(menuScope, function(clone){
          gridElement.append(clone);
        });

        /* jshint ignore:start */
        // Public Events for contextMenu feature
        grid.api.registerEventsFromObject({contextMenu: {
          show: function (grid, col, row) {},
          hide: function (grid, col, row) {}
        }});
        /* jshint ignore:end */

        // Public Api for contextMenu feature
        grid.api.registerMethodsFromObject({contextMenu: {
          addMenuItem: self.addMenuItem.bind(self, grid),
          addMenuItems: self.addMenuItems.bind(self, grid),
          removeMenuItem: self.removeMenuItem.bind(self, grid)
        }});

      };

    }
  ]);

  /**
   *  @ngdoc directive
   *  @name ui.grid.contextMenu.directive:uiGridContextMenu
   *  @element div
   *  @restrict A
   *
   *  @description Adds the context menu feature to the ui-grid directive.
   *  Intercepts contextMenu events on [ui-grid-cell] if triggered without modifier keys and only if there are menu items defined for the given rowCol
   *
   *  @example
   <example module="app">
   <file name="app.js">
   var app = angular.module('app', ['ui.grid', 'ui.grid.contextMenu']);

   app.controller('MainCtrl', ['$scope', function ($scope) {
      $scope.data = [
        { name: 'Bob', title: 'CEO' },
        { name: 'Frank', title: 'Lowly Developer' }
      ];

      $scope.columnDefs = [
        {name: 'name'},
        {name: 'title'}
      ];

      $scope.contextMenuItems = [
        {

        }
      ];

      $scope.gridOptions = {
        columnDefs: $scope.columnDefs,
        data: $scope.data,
        contextMenuItems: $scope.contextMenuItems
      };

    }]);
   </file>
   <file name="index.html">
   <div ng-controller="MainCtrl">
   <div ui-grid="gridOptions" ui-grid-context-menu></div>
   </div>
   </file>
   </example>
   */
  module.directive('uiGridContextMenu', ['uiGridContextMenuService', function createGridContextMenuDirective(uiGridContextMenuService){
    return {
      require: '^uiGrid',
      link: function (scope, $elm, $attrs, uiGridCtrl) {
        var grid = uiGridCtrl.grid;
        uiGridContextMenuService.initializeGrid(grid, $elm);

        $elm.on('contextmenu', '[ui-grid-cell]', function(evt){
          var cellElement = angular.element(evt.currentTarget);
          var cellScope = cellElement.scope();
          var col = cellScope && cellScope.col || null;
          var row = cellScope && cellScope.row || null;

          if(
            evt.ctrlKey || evt.shiftKey || evt.altKey || !col || !row ||
            !uiGridContextMenuService.isMenuEnabledForCell(grid, col, row)
          ){
            return true;
          }

          uiGridContextMenuService.showMenu(evt, grid, col, row, cellElement);

          evt.preventDefault();
          return false;
        });
      }
    };
  }]);

  /**
   *  @ngdoc directive
   *  @name ui.grid.contextMenu.directive:uiGridRenderContainer
   *  @element div
   *  @restrict A
   *
   *  @description Adds keydown listeners to renderContainer element so we can capture when to begin edits
   *
   */
  module.directive('uiGridViewport', [ '$window', '$document', '$templateCache', 'uiGridConstants', 'uiGridContextMenuService',
    function ($window, $document, $templateCache, uiGridConstants, uiGridContextMenuService){
      return {
        template: $templateCache.get('ui-grid/ui-grid-custom-context-menu-popup'),
        link: function (scope, $element) {
          var grid = scope.grid;

          if(!grid || !grid.contextMenu){
            throw new Error('grid.contextMenu is not defined');
          }

          scope.$watchCollection(function(){
            return grid.contextMenu.menuItems;
          }, function(menuItems){
            // TODO: inline groupBy and remove underscore dependency
            scope.menuItemGroups = groupBy(menuItems, 'groupName');
          });

          scope.hideMenu = function(){
            uiGridContextMenuService.hideMenu(grid);
          };

          scope.itemAction = function(evt, menuItem){
            evt.stopPropagation();

            if (!angular.isFunction(menuItem.action) || !scope.col || !scope.row) {
              return;
            }

            menuItem.action.call(null, grid, scope.col, scope.row);

            if (!menuItem.leaveOpen){
              uiGridContextMenuService.hideMenu(grid);
            } else {
              // TODO: focus cell
            }
          };

          scope.isItemShown = function(menuItem){
            if(!scope.col || !scope.row){
              return false;
            } else if(angular.isFunction(menuItem.shown)){
              return  menuItem.shown(grid, scope.col, scope.row);
            } else {
              return true;
            }
          };

          scope.isItemActive = function(menuItem){
            if(!scope.col || !scope.row || !angular.isFunction(menuItem.active)){
              return false;
            }
            return menuItem.active(grid, scope.col, scope.row);
          };

          //TODO: hide context menu on scroll
          //grid.on('scroll', (function(){
          //    uiGridContextMenuService.hideMenu(grid);
          //});

          var hideOnOutsideClick = function(evt){
            if($element[0] && $element[0].contains(evt.target)){
              return true;
            }
            scope.hideMenu();
          };

          var hideOnEsc = function(evt){
            if(evt.keyCode === uiGridConstants.keymap.ESC){
              scope.hideMenu();
            }
          };

          // hide menu on these events
          angular.element($window).on('blur', scope.hideMenu);
          $document.on('mousedown touchstart', hideOnOutsideClick);
          $document.on('keydown', hideOnEsc);

          // unregister event listeners
          scope.$on('$destroy', function(){
            angular.element($window).off('blur', scope.hideMenu);
            $document.off('mousedown  touchstart', hideOnOutsideClick);
            $document.off('keydown', hideOnEsc);
          });

        }
      };
    }]);

  /**
   *  @ngdoc directive
   *  @name ui.grid.contextMenu.directive:uiGridToggleContextMenu
   *  @element div
   *  @restrict A
   *
   *  @description This directive can be used on a button/link/icon etc. inside a custom
   *  cell template to display context menu items with reg click event instead of contextMenu.
   *  Should be used when you want a dedicated column for row actions.
   *
   *  Binds cell click event to 'showMenu'.
   */
  module.directive('uiGridToggleContextMenu', [ 'uiGridContextMenuService',
    function (uiGridContextMenuService){
      return {
        require: '^uiGrid',
        link: function (scope, $elm, $attrs, uiGridCtrl) {
          var grid = uiGridCtrl.grid;
          var cellElement = $elm.closest('[ui-grid-cell]');

          $elm.attr('role', 'button')
            .addClass('ui-grid-toggle-context-menu')
            .on('click', function(evt){
              if(!cellElement.length || !scope.col || !scope.row || !uiGridContextMenuService.isMenuEnabledForCell(grid, scope.col, scope.row)){
                //TODO: throw?
                return;
              }

              uiGridContextMenuService.showMenu(evt, grid, scope.col, scope.row, cellElement);
            });

        }
      };
    }]);

})();
