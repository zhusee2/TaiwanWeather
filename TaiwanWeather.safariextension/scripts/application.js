var weatherArea = sessionStorage.getItem('optWeatherArea') || 'Taipei_City',
    defaultTooltip = null,
    globalResult = null,
    currentWeatherForGlobalPage = {weatherIcon: null, cityName: null, temp: null, desc: null};
    
var isSafari = (typeof safari !== 'undefined'),
    isChrome = (typeof chrome !== 'undefined');

if (isSafari) {
  weatherArea = safari.extension.settings.optWeatherArea;
  defaultTooltip = safari.extension.toolbarItems[0].tooltip;  //Prevent chinese parsed with wrong encoding in extension.
}

function initCityDropdown() {
  var menu = $('#current ul.dropdown-menu');
  menu.empty();
  
  for(var i in cityNameEntities) {
    var menuItem = $('<a>').html(cityNameEntities[i]).attr('href', '#' + i);
    
    if (i == weatherArea) menuItem.prepend('<i class="icon-ok"></i> ');
    menuItem = $('<li>').append(menuItem);
    
    menu.append(menuItem);
  }
  
  menu.on('click', 'li a', function(event) {
    var newArea = $(this).attr('href').replace(/#/, '');
    
    if (isSafari) {
      safari.extension.settings.setItem('optWeatherArea', newArea);
    } else {
      sessionStorage.setItem('optWeatherArea', newArea);
      location.reload();
    }
    
    event.preventDefault();
  });
}

function updateForecast() {
  var queryUrl = 'http://www.cwb.gov.tw/V7/forecast/taiwan/inc/city/' + weatherArea + '.htm',
      forecastTable = new Array();

  var reformatDate = function (index, cell) {
    var string = cell.innerText
      .replace(/^0/, '').replace(/\/0/, '/')
      .replace(/\n.+(.$)/, '<br /><span class="badge badge-inverse">$1</span>');
    
    if (encodeURI(string).match(/%E5%85%AD/)) {
      string = string.replace(/badge-inverse/, 'badge-success');
    } else if (encodeURI(string).match(/%E6%97%A5/)) {
      string = string.replace(/badge-inverse/, 'badge-error');
    }
    
    forecastTable.push({date: string});
  };

  var reformatCell = function(index, cell) {
    var string = cell.innerText.trim(),
        data = {image: null, desc: null};
    
    data.image = $(cell).find('img').attr('src')
      .replace(/..\/..\//, 'http://www.cwb.gov.tw/pda/');
    data.desc = '<span class="desc">' + $(cell).find('img').attr('alt') + '</span>' + string.replace(/(\d+) ~ (\d+)/, '$1~$2&deg;');
    
    return data;
  };
  
  var repaintForecastTable = function() {
    var table = $('table#forecast');
    
    var paintCell = function(cell, data) {
      $(cell).empty().attr('title', $(data.desc).text());
      $('<img>').attr('src', data.image).appendTo(cell);
      $('<p>').html(data.desc).appendTo(cell);
    }
    
    table.find('thead th:not(:first-child)').each(function(index, cell) {
      $(cell).html(forecastTable[index].date);
    });
    table.find('tbody tr:first-child td:not(:first-child)').each(function(index, cell) {
      paintCell(cell, forecastTable[index].day);
    });
    table.find('tbody tr+tr td:not(:first-child)').each(function(index, cell) {
      paintCell(cell, forecastTable[index].night);
    });
  };
  
  $.get(queryUrl, function(data) {
    var result = {
      date: $(data).find('thead th:not(:first-child)'),
      day: $(data).find('tbody tr:first-child td'),
      night: $(data).find('tbody tr+tr td'),
      lastUpdate: $(data).find('span.Issued').text()
    };
    
    //Reformat date header
    result['date'].each(reformatDate);
    
    //Parse & reformat forecast
    result['day'].each(function(index, cell) {
      forecastTable[index]['day'] = (reformatCell(index, cell));
    });
    result['night'].each(function(index, cell) {
      forecastTable[index]['night'] = (reformatCell(index, cell));
    });
    
    //Update last-update badge
    $('h3 span.lastUpdate').text(result.lastUpdate);

    repaintForecastTable();
  });

}

function updateCurrent() {
  var queryUrl = 'http://www.cwb.gov.tw/pda/observe/real/' + realtimeStationLocation[weatherArea] + '.htm', //Taipei
      realtimeData = {};
  
  $.get(queryUrl, function(data) {
    var dataList = $(data).find('li.smallfield span.headerText');

    realtime = {
      time: dataList[0].innerText,
      location: $(data).find('li.selectRight option:selected').text(),
      weather: dataList[1].innerText,
      weatherIcon: $(dataList[1]).find('img').attr('src').replace(/^\//, 'http://www.cwb.gov.tw/'),
      temp: dataList[2].innerText
    };
    
    currentWeatherForGlobalPage.weatherIcon = $(dataList[1]).find('img').attr('src').match(/\/(\d+)\.(png|gif)/)[1];

    if (currentWeatherForGlobalPage.weatherIcon >= 99) {
      try {
        var currentForecast = $('#forecast tbody tr:first-child td:nth-child(2)');

        realtime.weather = currentForecast.attr('title');
        realtime.weatherIcon = currentForecast.find('img').attr('src');
        currentWeatherForGlobalPage.weatherIcon = realtime.weatherIcon.match(/\/(\d+)\.(png|gif)/)[1];
      } catch(e) {
        setTimeout(updateCurrent, 500);
      }
    }

    $('#current span.cityName').html(cityNameEntities[weatherArea]);
    currentWeatherForGlobalPage.cityName = cityNameEntities[weatherArea];

    $('#current span.desc').html(realtime.weather + ' ' + realtime.temp + '&deg;C');
    $('#current img').attr('src', realtime.weatherIcon);
    $('#current small.lastUpdate span.location').text(realtime.location);
    $('#current small.lastUpdate span.time').text(realtime.time);
    
    currentWeatherForGlobalPage.desc = $('#current span.desc').text();
    currentWeatherForGlobalPage.temp = realtime.temp;
  });

}

function validateCommand(event) {
  if (event.command === 'btnWeather') {
    var toolbarItem = event.target,
        currentWeather = safari.extension.popovers[0].contentWindow.currentWeatherForGlobalPage,
        showCurrent = safari.extension.settings.optShowCurrent;

    toolbarItem.toolTip = currentWeather.cityName + ' ' + currentWeather.desc;
    toolbarItem.badge = showCurrent ? currentWeather.temp : 0;
  }
}

function settingsChanged(event) {
  if (event.key == 'optWeatherArea') {
    safari.extension.popovers[0].contentWindow.location.reload();
  }
  if (event.key == 'optShowForecast') {
    safari.extension.popovers[0].width = event.newValue ? 600 : 250;
    safari.extension.popovers[0].height = event.newValue ? 400 : 150; 
  }
}

function popoverFocus(event) {
  var lastUpdate = event.target.document.querySelector('#current small.lastUpdate span.time').innerText,
      lastUpdateTime, currentTime = new Date();
      
  lastUpdateTime = new Date(currentTime.getFullYear() + '/' + lastUpdate + ' GMT+0800');
  
  if (currentTime - lastUpdateTime > 1200000) { //20mins
    event.target.updateForecast();
    event.target.updateCurrent();
    
    console.log('Updating weather info');
  }
  
  $(event.target.document).find('h3, #forecast').toggleClass('hide', !safari.extension.settings.optShowForecast);
}

if (isSafari) {
  if (safari.self instanceof SafariExtensionGlobalPage) {
    safari.application.addEventListener("validate", validateCommand);
    safari.extension.settings.addEventListener("change", settingsChanged);
    safari.extension.popovers[0].contentWindow.addEventListener('focus', popoverFocus);
  }
}

$(document).ready(function() {
  updateForecast();
  updateCurrent();
  initCityDropdown();
});