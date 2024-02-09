const getFormattedDate = (date, withTime = true) => {
    if (date === undefined) {
        return '';
    }
    var year = date.getFullYear();
  
    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;
  
    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
  
    var hour = date.getHours().toString();
    hour = hour.length > 1 ? hour : '0' + hour;
  
    var minutes = date.getMinutes().toString();
    minutes = minutes.length > 1 ? minutes : '0' + minutes;
  
    var sec = date.getSeconds().toString();
    sec = sec.length > 1 ? sec : '0' + sec;
  
    return withTime
        ? (year + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + sec)
        : (year + '-' + month + '-' + day);
}

export { getFormattedDate };