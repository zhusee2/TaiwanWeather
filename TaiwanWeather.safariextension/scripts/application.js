try {
  var weatherArea = safari.extension.settings.optWeatherArea,
      showForecast = safari.extension.settings.optShowForecast,
      globalResult = null;
} catch(e) {
  var weatherArea = 'Taipei_City',
      showForecast = true,
      globalResult = null;
}
    
$(document).ready(function() {
  updateCurrent();
  updateForecast();
});

function updateForecast() {
  var queryUrl = 'http://www.cwb.gov.tw/V7/forecast/taiwan/inc/city/Taipei_City.htm',
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
    $('#forecast span.lastUpdate').text(result.lastUpdate);

    repaintForecastTable();
  });

}

function updateCurrent() {
  var queryUrl = 'http://www.cwb.gov.tw/pda/observe/real/46692.htm', //Taipei
      realtimeData = {};
  
  $.get(queryUrl, function(data) {
    var dataList = $(data).find('li.smallfield span.headerText');

    realtime = {
      time: dataList[0].innerText,
      location: $(data).find('li.selectRight option:selected').text(),
      weather: dataList[1].innerText,
      temp: dataList[2].innerText
    }
    
    try {
      realtime.weatherIcon = $(dataList[1]).find('img').attr('src').replace(/^\//, 'http://www.cwb.gov.tw/');
    } catch(e) {
      realtime.weatherIcon = null;
    }
    
    $('#current span.desc').html(realtime.weather + ' ' + realtime.temp + '&deg;C');
    $('#current img').attr('src', realtime.weatherIcon);
    $('#current small.lastUpdate span.location').text(realtime.location);
    $('#current small.lastUpdate span.time').text(realtime.time);
  });

}