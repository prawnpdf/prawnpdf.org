(function() {

  class StorageStub {
    key(name) { return false };
    setItem(name, value) {};
    getItem(name) {};
    removeItem(name) {};
    clear() {};
  }

var localStorage = new StorageStub(),
    sessionStorage = new StorageStub();;
try { localStorage = window.localStorage; } catch (e) { }
try { sessionStorage = window.sessionStorage; } catch (e) { }

function createDefineLinks() {
    var tHeight = 0;
    $('.defines').after(" <a href='#' class='toggleDefines'>more...</a>");
    $('.toggleDefines').toggle(function() {
        tHeight = $(this).parent().prev().height();
        $(this).prev().css('display', 'inline');
        $(this).parent().prev().height($(this).parent().height());
        $(this).text("(less)");
    },
    function() {
        $(this).prev().hide();
        $(this).parent().prev().height(tHeight);
        $(this).text("more...");
    });
}

function createFullTreeLinks() {
    var tHeight = 0;
    $('.inheritanceTree').toggle(function() {
        tHeight = $(this).parent().prev().height();
        $(this).parent().toggleClass('showAll');
        $(this).text("(hide)");
        $(this).parent().prev().height($(this).parent().height());
    },
    function() {
        $(this).parent().toggleClass('showAll');
        $(this).parent().prev().height(tHeight);
        $(this).text("show all");
    });
}

function searchFrameButtons() {
  $('.full_list_link').click(function() {
    toggleSearchFrame(this, $(this).attr('href'));
    return false;
  });
  window.addEventListener('message', function(e) {
    if (e.data === 'navEscape') {
      $('#nav').slideUp(100);
      $('#search a').removeClass('active inactive');
      $(window).focus();
    }
  });

  $(window).resize(function() {
    if ($('#search:visible').length === 0) {
      $('#nav').removeAttr('style');
      $('#search a').removeClass('active inactive');
      $(window).focus();
    }
  });
}

function toggleSearchFrame(id, link) {
  var frame = $('#nav');
  $('#search a').removeClass('active').addClass('inactive');
  if (frame.attr('src') === link && frame.css('display') !== "none") {
    frame.slideUp(100);
    $('#search a').removeClass('active inactive');
  }
  else {
    $(id).addClass('active').removeClass('inactive');
    if (frame.attr('src') !== link) frame.attr('src', link);
    frame.slideDown(100);
  }
}

function linkSummaries() {
  $('.summary_signature').click(function() {
    document.location = $(this).find('a').attr('href');
  });
}

function summaryToggle() {
  document.querySelectorAll('.summary_toggle').forEach(function(toggle) {
    let section = toggle.parentElement.parentElement.parentElement;

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.setItem(section.getAttribute('id'), this.textContent);
      let summary = section.querySelector('ul.summary');
      if (!summary.classList.contains('compact')) {
        let list = document.createElement('ul')
        list.classList.add('summary', 'compact');
        list.innerHTML = summary.innerHTML;
        list.querySelectorAll('.summary_desc, .note').forEach((el) => el.remove());
        list.querySelectorAll('a').forEach(function(el) {
          el.innerHTML = el.querySelector('strong').innerHTML;
          el.parentElement.innerHTML = el.outerHTML;
        });
        summary.insertAdjacentElement('beforebegin', list);
      }

      if (this.textContent === 'collapse') {
        this.textContent = 'expand';
        section.querySelector('.summary.compact').style.removeProperty('display');
        section.querySelector('.summary.compact + .summary').style.display = 'none';
      } else {
        this.textContent = 'collapse';
        section.querySelector('.summary.compact').style.display = 'none';
        section.querySelector('.summary.compact + .summary').style.removeProperty('display');
      }
    });

    if (localStorage.getItem(section.getAttribute('id')) == 'collapse') {
      toggle.dispatchEvent(new Event('click'));
    }
  });
}

function constantSummaryToggle() {
  $('.constants_summary_toggle').click(function(e) {
    e.preventDefault();
    localStorage.setItem('summaryCollapsed', $(this).text());
    //$('.constants_summary_toggle').each(function() {
      $(this).text($(this).text() == "collapse" ? "expand" : "collapse");
      var next = $(this).parent().parent().nextAll('dl.constants').first();
      if (next.hasClass('compact')) {
        next.toggle();
        next.nextAll('dl.constants').first().toggle();
      }
      else if (next.hasClass('constants')) {
        var list = $('<dl class="constants compact" />');
        list.html(next.html());
        list.find('dt').each(function() {
           $(this).addClass('summary_signature');
           $(this).text( $(this).text().split('=')[0]);
          if ($(this).has(".deprecated").length) {
             $(this).addClass('deprecated');
          };
        });
        // Add the value of the constant as "Tooltip" to the summary object
        list.find('pre.code').each(function() {
          console.log($(this).parent());
          var dt_element = $(this).parent().prev();
          var tooltip = $(this).text();
          if (dt_element.hasClass("deprecated")) {
             tooltip = 'Deprecated. ' + tooltip;
          };
          dt_element.attr('title', tooltip);
        });
        list.find('.docstring, .tags, dd').remove();
        next.before(list);
        next.toggle();
      }
    //});
    return false;
  });
  if (localStorage.setItem('summaryCollapsed', "collapse")) {
    $('.constants_summary_toggle').first().click();
  } else { localStorage.setItem('summaryCollapsed', "expand"); }
}

function generateTOC() {
  if (!document.getElementById('filecontents')) return;

  var _toc = $('<ol class="top"></ol>');
  var show = false;
  var toc = _toc;
  var counter = 0;
  var tags = ['h2', 'h3', 'h4', 'h5', 'h6'];
  var i;
  var curli;
  if ($('#filecontents h1').length > 1) tags.unshift('h1');
  for (i = 0; i < tags.length; i++) { tags[i] = '#filecontents ' + tags[i]; }
  var lastTag = parseInt(tags[0][1], 10);
  $(tags.join(', ')).each(function() {
    if ($(this).parents('.method_details .docstring').length != 0) return;
    if (this.id == "filecontents") return;
    show = true;
    var thisTag = parseInt(this.tagName[1], 10);
    if (this.id.length === 0) {
      var proposedId = $(this).attr('toc-id');
      if (typeof(proposedId) != "undefined") this.id = proposedId;
      else {
        var proposedId = $(this).text().replace(/[^a-z0-9-]/ig, '_');
        if ($('#' + proposedId).length > 0) { proposedId += counter; counter++; }
        this.id = proposedId;
      }
    }
    if (thisTag > lastTag) {
      for (i = 0; i < thisTag - lastTag; i++) {
        if ( typeof(curli) == "undefined" ) {
          curli = $('<li/>');
          toc.append(curli);
        }
        toc = $('<ol/>');
        curli.append(toc);
        curli = undefined;
      }
    }
    if (thisTag < lastTag) {
      for (i = 0; i < lastTag - thisTag; i++) {
        toc = toc.parent();
        toc = toc.parent();
      }
    }
    var title = $(this).attr('toc-title');
    if (typeof(title) == "undefined") title = $(this).text();
    curli =$('<li><a href="#' + this.id + '">' + title + '</a></li>'); 
    toc.append(curli);
    lastTag = thisTag;
  });
  if (!show) return;
  html = '<div id="toc"><p class="title hide_toc"><a href="#"><strong>Table of Contents</strong></a></p></div>';
  $('#content').prepend(html);
  $('#toc').append(_toc);
  $('#toc .hide_toc').toggle(function() {
    $('#toc .top').slideUp('fast');
    $('#toc').toggleClass('hidden');
    $('#toc .title small').toggle();
  }, function() {
    $('#toc .top').slideDown('fast');
    $('#toc').toggleClass('hidden');
    $('#toc .title small').toggle();
  });
}

function navResizeFn(e) {
  if (e.which !== 1) {
    navResizeFnStop();
    return;
  }

  sessionStorage.setItem('navWidth', e.pageX.toString());
  $('.nav_wrap').css('width', e.pageX);
  $('.nav_wrap').css('-ms-flex', 'inherit');
}

function navResizeFnStop() {
  $(window).unbind('mousemove', navResizeFn);
  window.removeEventListener('message', navMessageFn, false);
}

function navMessageFn(e) {
  if (e.data.action === 'mousemove') navResizeFn(e.data.event);
  if (e.data.action === 'mouseup') navResizeFnStop();
}

function navResizer() {
  $('#resizer').mousedown(function(e) {
    e.preventDefault();
    $(window).mousemove(navResizeFn);
    window.addEventListener('message', navMessageFn, false);
  });
  $(window).mouseup(navResizeFnStop);

  if (sessionStorage.key('navWidth')) {
    navResizeFn({which: 1, pageX: parseInt(sessionStorage.getItem('navWidth'), 10)});
  }
}

function navExpander() {
  var done = false, timer = setTimeout(postMessage, 500);
  function postMessage() {
    if (done) return;
    clearTimeout(timer);
    var opts = { action: 'expand', path: pathId };
    document.getElementById('nav').contentWindow.postMessage(opts, '*');
    done = true;
  }

  window.addEventListener('message', function(event) {
    if (event.data === 'navReady') postMessage();
    return false;
  }, false);
}

function mainFocus() {
  var hash = window.location.hash;
  if (hash !== '' && $(hash)[0]) {
    $(hash)[0].scrollIntoView();
  }

  setTimeout(function() { $('#main').focus(); }, 10);
}

function navigationChange() {
  // This works around the broken anchor navigation with the YARD template.
  window.onpopstate = function() {
    var hash = window.location.hash;
    if (hash !== '' && $(hash)[0]) {
      $(hash)[0].scrollIntoView();
    }
  };
}

$(document).ready(function() {
  navResizer();
  navExpander();
  createDefineLinks();
  createFullTreeLinks();
  searchFrameButtons();
  linkSummaries();
  summaryToggle();
  constantSummaryToggle();
  generateTOC();
  mainFocus();
  navigationChange();
});

})();
