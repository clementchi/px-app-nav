
Polymer({

  is: 'px-app-nav',

  properties: {

    /**
     * Object array of items and sub-items in the nav.
     * Each object in the Array can specify '[path-key]', 'label', 'icon'
     * 'eventName', and 'subitems', which is another Array.
     *
     * @type {Array}
     * @default [{}]
     */
    navItems: {
      type: Array,
      notify: true,
      value: function() {
        return [{}];
      },
      observer: '_handleNavItems'
    },

    /**
     * When navigating, this prefix is appended to the relative URL. Defaults to '#', indicating paths are routed via the
     * hash part of the URL.  To make them relative to current directory, use '/'.
     *
     * @type {String}
     * @default ["#"]
     */
    pathPrefix: {
      value : '#',
      type: String
    },

    /**
     * Allows a level of indirection in the Array of navItems passed in to resolve paths
     *
     * @type {String}
     * @default ["path"]
     */
    pathKey: {
      value: 'path',
      type: String
    },

    /**
     * Whether the navigation is expanded. Reflected to an attribute
     * so the app can bind to it and maintain state as needed.
     *
     * @type {Boolean}
     * @default [true]
     */
    navExpanded: {
      value: true,
      type: Boolean,
      reflectToAttribute: true,
      observer: '_handleNavExpanded'
    },

    /**
     * Whether the navigation is contracting.
     * Reflected to an attribute (reflectToAttribute: true)
     *
     * @type {Boolean}
     * @default [true]
     */
    navContracting: {
      value: true,
      type: Boolean,
      reflectToAttribute: true
    },

    /**
     * Animation function
     *
     * @type {Function}
     * @default [function(){ return {};}]
     * @private
     */
    ani:{
      type: Object,
      value:function(){ return {};}
    }
  },

  /**
   * Internal representation of navigation items
  */
  _navItems: [{}],

  /**
   * RegEx to force https
  */
  _protocolRegEx: new RegExp('(http|https)://'),

  // Set media query and if navItems are available, reset (init)
  ready: function() {
    this._setMediaQuery();
    if (this.navItems && this.navItems.length > 0) {
      this._resetNav();
    }
  },

  // Reset with new navItems
  _resetNav: function() {
    this._navItems = this._reconcileNavItems(this.navItems);
    this._setSubNavVisibility();
    this._potentiallyAdjustAccordion();
    this._markSelected(window.location.href);
  },

  /**
   * Reconcile internal representation of navItems for use in the template
   * Parse navItemsStrings and navItemsPaths to create unified navItems
  */
  _reconcileNavItems: function(items) {
    items.forEach(this._reconcileNavItem, this);
    return items;
  },

  // Reconcile individual nav item
  _reconcileNavItem: function(item) {
    item = this._addHrefToItem(item);
    item = this._checkItemClass(item);
    item = this._computeIcon(item);
    return item;
  },

  // Set responsive media query to toggle nav expansion on screen width change
  _setMediaQuery: function() {
    var _this = this;
    var mediaQuery = window.matchMedia('screen and (max-width: 63.9rem)');
    if (mediaQuery.matches) {
      this.toggleNav();
    }
    // add listener on screen width change
    mediaQuery.addListener(function(data) {
      if (data.matches) {
        // width is less than 63.9rem in width
        if (_this.navExpanded) {
          _this.toggleNav();
        }
      }
      else {
        // width is greater than 63.9rem
        if (!_this.navExpanded) {
          _this.toggleNav();
        }
      }
    });
  },

  _potentiallyAdjustAccordion: function() {
    this.navItems.forEach(function(item){
      var navSubitems = item.subitems;
      if (navSubitems && navSubitems.length >= 1 && item.subSelected) {
        // if subselected && has subitems
        var parentA = this._selectSubSelected();
        var parent = parentA.parentElement.querySelector('ul');
        var heightAfter = this._calcHeightAfter(navSubitems, parentA);
        var listResizeAnimation = this._keyframeBuilder(parent, heightAfter);
        document.timeline.play(listResizeAnimation);
      }
     }, this);
  },

  _selectSubSelected: function() {
    return Polymer.dom(this.$.navitemlist).querySelector('a.subselected');
  },

  _calcHeightAfter: function(navSubitems, parentA) {
    return (navSubitems.length * (parentA.clientHeight * 0.6666)) + 'px';
  },

  _keyframeBuilder: function(parent, heightAfter) {
    return new SequenceEffect([
      new KeyframeEffect(
        parent,
        [ {height: parent.clientHeight}, {height: heightAfter}],
        { duration: 200, fill: 'forwards' }
      )
    ]);
  },

  /**
   * When a nav item is selected, calls _markSelected(). The actual navigation is accomplished without JavaScript using
   * an HTML anchor tag unless the passed click event is cancelled / stopPropagation().
   *
   * @see #_markSelected
   * @param {Event} evt The click event.
   * @private
   */
  navClickHandler: function(e) {
    var el = e.currentTarget;
    var href = el.getAttribute("href");
    var listItemEl = Polymer.dom(el.parentElement);
    var subnavEl = listItemEl.querySelector('ul');
    this._markSelected(href);
    this._customEventIsSet(el) ? this._fireCustomEvent(el) : null;
    this._animateMenuItem(subnavEl);
  },

  _customEventIsSet: function(el) {
    var attr = el.getAttribute("event-name");
    return (typeof attr === 'string' && attr.length > 0);
  },

  _fireCustomEvent: function(el) {
    this.fire(el.getAttribute("event-name"));
  },


  _animateMenuItem: function(subnavEle){
    var hidden = subnavEle.classList.contains('visuallyhidden'),
        allSubNavSpans = Polymer.dom(subnavEle).querySelectorAll("span"),
        self = this,
        navToHide,
        navToHideSpans,
        allSubNavs = Polymer.dom(this.$.navitemlist).querySelectorAll("ul"),
        openAnimation;

    for (var i=0; i<allSubNavs.length; i++) {
      if (allSubNavs[i] === subnavEle && !allSubNavs[i].classList.contains('visuallyhidden')){
        navToHide = allSubNavs[i];
        navToHideSpans = Polymer.dom(navToHide).querySelectorAll("span");
      }
    }
    if (navToHide){
      openAnimation = new SequenceEffect([
                            this._closeAccordionEffectAnimation(navToHide, navToHideSpans),
                            this._openAccordionEffectAnimation(subnavEle, allSubNavSpans)
                          ]);
    } else if (!hidden){
      openAnimation = this._closeAccordionEffectAnimation(subnavEle, allSubNavSpans);
    } else{
      openAnimation = this._openAccordionEffectAnimation(subnavEle, allSubNavSpans);

    }

    var accordionAnimationPlayer = document.timeline.play(openAnimation);

    accordionAnimationPlayer.addEventListener('finish', function(){
      self._navResized();
      if(!self.navExpanded){
        self.toggleNav();
      }
    });

  },

  _navResized: function() {
    this.fire('nav-height-changed');
  },

  /**
   * When a nav item is selected, calls _markSelected(). The actual navigation is accomplished without JavaScript using
   * an HTML anchor tag unless the passed click event is cancelled / stopPropagation().
   *
   * @see #_markSelected
   * @param {Event} evt The click event.
   * @private
   */
   subnavClickHandler: function(evt){
     var el = evt.currentTarget;
     if (el.getAttribute("event-name")) {
       this.fire(el.getAttribute("event-name"));
     }
     var href = el.getAttribute("href");
     this._markSelected(href);
     var self = this;
     // We need a short delay for Safari to fire navResized after nav resize.
     setTimeout(function() {
        self._navResized();
      }, 100);
   },

  /**
   * Marks the nav item with the given path as selected, and all others as unselected.
   *
   * @param {String} path The selected path
   */
  _markSelected: function(path) {
    var resolvedPath = this._parseOutPathPrefix(path);
    var topLevelNavElems = Polymer.dom(this.root).querySelectorAll("#navitemlist>li");
    if (this.navItems){
      for (var i = 0; i < this.navItems.length; i++) {
        var item = this.navItems[i];
        item.selected = item[this.pathKey] === resolvedPath;
        item.subSelected = false;
        item.class = item.selected ? "selected" : "";
        if (item.subitems) {
          item.subitems.forEach(this._asdf, this);
        }
        this.toggleClass("selected", item.selected, Polymer.dom(topLevelNavElems[i]).querySelector('a'));
        this.toggleClass("subselected", item.subSelected, Polymer.dom(topLevelNavElems[i]).querySelector('a'));
      }
    }
  },

  _asdf: function(subitem, idx) {
    subitem.selected = subitem[this.pathKey] === resolvedPath;
    subitem.class = subitem.selected ? "selected" : "";
    if(topLevelNavElems.length > 0){
      if(idx < Polymer.dom(topLevelNavElems[i]).querySelectorAll('ul>li').length) {
        this.toggleClass("selected", subitem.selected, Polymer.dom(topLevelNavElems[i]).querySelectorAll('ul>li')[idx].querySelector('a'));
      }
    }
    item.subSelected = subitem.selected ? true : item.subSelected;
  },

  _setSubNavVisibility: function(){
    this.navItems.forEach( function(item){
      if (item.subSelected){
        item.subitemlistclass = "list-bare";
        item.subitemclass = "";
        item.class = "subselected";
      }
      else{
        item.subitemlistclass = "visuallyhidden list-bare";
        item.subitemclass = "visuallyhidden";
      }
    }, this);
  },

  _parseOutPathPrefix: function(fullPath) {
    if (!fullPath) {
        return null;
    };
    var resolvedPath = fullPath.replace(this._protocolRegEx, '');
    var idx = resolvedPath.indexOf(this.pathPrefix);
    var argsIdx = resolvedPath.indexOf('?');

    if (argsIdx === -1){
      argsIdx = resolvedPath.length;
    }

    return resolvedPath.substring(idx + 1, argsIdx);
  },

  _checkItemClass: function(item) {
    if (!item.class){
      item.subitemlistclass = item.subitemclass = item.class = "";
    }
    return item;
  },

  /*
  * item.href is computed as pathPrefix (such as "#!/") prepended to actual
  * path value (looked up by externally defined pathKey, default: 'path')
  */
  _addHrefToItem(item) {
    item.href = this.pathPrefix + '/' + item[this.pathKey];
    if (item.subitems) {
      item.subitems.forEach(this._addHrefToItem, item.subitems);
    };
    return item;
  },

  _computeIcon: function(item) {
    item.icon += " fa";
    return item;
  },

  _keyframeFadeIn: function(el) {
    return new KeyframeEffect(el, [ {opacity: 0}, {opacity: 1} ], 100);
  },

  _keyframeFadeOut: function(el) {
    return new KeyframeEffect(el, [ {opacity: 1}, {opacity: 0} ], 100);
  },

  _keyframeFadeInAll: function(els) {
    var _this = this;
    return new GroupEffect(els.map(function(el) {
      return _this._keyframeFadeIn(el);
    }));
  },

  _keyframeFadeOutAll: function(els) {
    var _this = this;
    return new GroupEffect(els.map(function(el) {
      return _this._keyframeFadeOut(el);
    }));
  },

  _keyframeAnimateWidth: function(el, from, to) {
    // Return keyframe effect animating el width 'from' 'to', in 200ms
    return new KeyframeEffect(el, [{ width: from}, { width: to}], 200);
  },

  _keyframeContractWidth: function(el) {
    // Return keyframe effect animating el width from 219px to 56px, in 200ms
    return this._keyframeAnimateWidth(el, '219px', '56px');
  },

  _keyframeExpandWidth: function(el) {
    // Return keyframe effect animating el width from 56px to 219px, in 200ms
    return this._keyframeAnimateWidth(el, '56px', '219px');
  },

  _keyframeToggleClass: function(el, className) {
    // Return keyframe effect toggling class on element, 0ms
    return new KeyframeEffect(el, function(tf) {
      if (tf == null) {
        return;
      } else {
        el.classList.toggle(className);
      };
    }, { duration: 0, fill: 'forwards' })
  },

  _keyframeToggleClassAll: function(els, className) {
    // Return grouped keyframe effects toggling class on all els, 0ms
    _this = this;
    return new GroupEffect(els.map(function(el) {
      return _this._keyframeToggleClass(el, className);
    }));
  },

  _keyframeContractAccordian: function(el) {
    // Contract the accordian from it's current height to 0px in 200ms
    var accordionHeight = el.clientHeight + 'px';
    return new KeyframeEffect(el,
      [{ height: accordionHeight }, { height: '0px' }],
      { duration: 200, fill: 'forwards' });
  },

  _keyframeExpandAccordian: function(el, textEls) {
    var accordionHeight = textEls.length * (el.parentElement.clientHeight * 0.6666) + 'px';
    return new KeyframeEffect(el, [{ height: '0px' }, { height: accordionHeight }], { duration: 200, fill: 'forwards' });
  },

  _closeAccordionEffectAnimation: function(mainEl, textEls){
    var _this = this;
    // Animate the closing of the open accordion
    // Animation sequence:
    // 1. Fade out all text elements
    // 2. Toggle class 'visuallyhidden' on all text elements
    // 3. Contract the accordian element height
    // 4. Toggle class 'visuallyhidden' on all text elements
    return new SequenceEffect([
      _this._keyframeFadeOutAll(textEls),
      _this._keyframeToggleClassAll(textEls, 'visuallyhidden'),
      _this._keyframeContractAccordian(mainEl),
      _this._keyframeToggleClassAll(textEls, 'visuallyhidden')
    ]);
  },

  _openAccordionEffectAnimation: function(mainEl, textEls){
    // Animation sequence:
    // 1. Toggle class 'visuallyhidden'
    // 2. Expand the accordian element height
    // 3. Toggle class 'visuallyhidden' on all text elements
    // 4. Fade in all text elements
    var _this = this;
    return new SequenceEffect([
      _this._keyframeToggleClass(mainEl, 'visuallyhidden'),
      _this._keyframeExpandAccordian(mainEl, textEls),
      _this._keyframeToggleClassAll(textEls, 'visuallyhidden'),
      _this._keyframeFadeInAll(textEls)
    ]);
  },

  _contractNavAnimation: function(navEl, textEls) {
    // Animation sequence:
    // 1. Fade out all <span> text elements
    // 2. Add 'navbar--text-hidden' class
    // 3. Contract the container element
    // 4. Add 'navbar--collapsed' class
    var _this = this;
    return new SequenceEffect([
      _this._keyframeFadeOutAll(textEls),
      _this._keyframeToggleClass(navEl, 'navbar--text-hidden', true),
      _this._keyframeContractWidth(navEl),
      _this._keyframeToggleClass(navEl, 'navbar--collapsed', true)
    ]);
  },

  _expandNavAnimation: function(navEl, textEls) {
    var _this = this;
    // Animation sequence:
    // 1. Remove 'navbar--collapsed' class
    // 2. Expand the container element
    // 3. Remove 'navbar--text-hidden' class
    // 4. Fade in all <span> text elements
    return new SequenceEffect([
      _this._keyframeToggleClass(navEl, 'navbar--collapsed', false),
      _this._keyframeExpandWidth(navEl),
      _this._keyframeToggleClass(navEl, 'navbar--text-hidden', false),
      _this._keyframeFadeInAll(textEls)
    ]);
  },

  _getTextEls: function() {
    // return all children <span> elements
    return Polymer.dom(this.root).querySelectorAll("span");
  },

  _expandNav: function() {
    // Notify listeners that animation is in progress
    var navAnimation = this._expandNavAnimation(this, this._getTextEls());
    this.ani = document.timeline.play(navAnimation);
    this.ani.addEventListener('finish', function(){
      // raise event once we've expanded;
      this.fire('nav-expanded');
      // ensure animation is complete then dispatch global scope-resize event
      setTimeout(function() {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }.bind(this));
  },

  _contractNav: function() {
    this.navContracting = true;
    var navAnimation = this._contractNavAnimation(this, this._getTextEls());
    this.ani = document.timeline.play(navAnimation);
    this.ani.addEventListener('finish', function(){
      this.navContracting = false;
      this.fire('nav-collapsed');
      // let the nav bar animation truly finish before broadcasting a window resize event
      // so other components can react after the animation
      setTimeout(function(){
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }.bind(this));
  },

  /**
   * Called when the nav expander control is clicked.
   *
   * @param {Event} evt The click event.
   * @private
   */
  toggleNav: function(e) {
    this.set('navExpanded', !this.navExpanded);
  },

  /**
   * navExpanded observer. Handles change by expanding or contracting nav
   *
   * @param {Boolean} newValue The new value of navExpanded.
   * @private
  */
  _handleNavExpanded: function(newValue) {
    if(!newValue) {
      this.fire('nav-expanding');
      this._expandNav();
    } else {
      this.fire('nav-collapsing');
      this._contractNav();
    };
  },

  _handleNavItems: function(newValue) {
    if (!newValue){
      this._navItems = [{}];
    } else {
      this._resetNav();
    }
  },

});
