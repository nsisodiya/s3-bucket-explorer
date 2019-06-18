function putInsideObj(obj, fullKey) {
  var tempObj = obj;
  fullKey.split("/").map(function(folder, i, A) {
    if (tempObj[folder] === undefined) {
      tempObj[folder] = {};
    }

    if (i + 1 === A.length) {
      tempObj[folder] = fullKey;
    } else {
      tempObj = tempObj[folder];
    }
  });
}

function convertDirToHTML(dirObj) {
  var html = "<ul>";
  Object.keys(dirObj).forEach(function(key) {
    if (typeof dirObj[key] === "object") {
      html =
        html +
        `<li>
        <a href="#">${key}</a> 
        ${convertDirToHTML(dirObj[key])}
      </li>`;
    } else {
      html =
        html +
        `<li>
        <a target="_blank" href="${dirObj[key]}">${key}</a> 
      </li>`;
    }
  });
  var html = html + "</ul>";
  return html;
}

function getAllContent(url, token, callback, finalCallback) {
  var origUrl = url;
  console.log("getAllContent called", url, token);
  if (token !== undefined) {
    url = url + "?list-type=2&continuation-token=" + encodeURIComponent(token);
  } else {
    url = url + "?list-type=2";
  }
  console.log("Calling", url);
  fetch(url).then(res => {
    sMyString = res.text().then(text => {
      var oParser = new DOMParser();
      var oDOM = oParser.parseFromString(text, "text/xml");
      console.log("xmlToJson", xmlToJson(oDOM));
      var ListBucketResult = xmlToJson(oDOM).ListBucketResult;
      var IsTruncated = ListBucketResult.IsTruncated;
      console.log("Contents", ListBucketResult.Contents.length);
      callback(JSON.parse(JSON.stringify(ListBucketResult.Contents)));
      if (ListBucketResult.IsTruncated === "true") {
        //CAll another Listing URL;
        getAllContent(
          origUrl,
          ListBucketResult.NextContinuationToken,
          callback,
          finalCallback
        );
      } else {
        console.log("all listing done");
        finalCallback();
      }
    });
  });
}

function getAllContentWrapper(url, callback) {
  var allContent = [];
  getAllContent(
    url,
    undefined,
    function(data) {
      allContent = allContent.concat(data);
    },
    function() {
      //Final callback, all data is here.
      callback(allContent);
    }
  );
}
// Changes XML to JSON
// Modified version from here: http://davidwalsh.name/convert-xml-json
function xmlToJson(xml) {
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) {
    // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) {
    // text
    obj = xml.nodeValue;
  }

  // do children
  // If just one text node inside
  if (
    xml.hasChildNodes() &&
    xml.childNodes.length === 1 &&
    xml.childNodes[0].nodeType === 3
  ) {
    obj = xml.childNodes[0].nodeValue;
  } else if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof obj[nodeName] == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof obj[nodeName].push == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

$(document).ready(function() {
  var bucket = window.location.host.split(".")[0];
  var host = window.location.host;
  var startPosition = host.search("s3-website");
  var region2 = host.substring(startPosition + 11).split(".")[0];
  var urlSuffix;
  if (region2 === "us-east-1") {
    urlSuffix = ".s3.amazonaws.com";
  } else {
    urlSuffix = ".s3." + region2 + ".amazonaws.com";
  }

  var url = "http://" + bucket + urlSuffix;
  getAllContentWrapper(url, function(S3JSONData) {
    console.log("All data downloaded", S3JSONData);
    var allData = {};
    for (let index = 0; index < S3JSONData.length; index++) {
      const v = S3JSONData[index];
      if (v.Size !== "0") {
        putInsideObj(allData, v.Key);
      }
    }
    //Deleting unwanted folders;
    var htmlCode = convertDirToHTML(allData);
    document.getElementById("root").innerHTML = htmlCode;
    $(document.getElementById("root").childNodes[0]).filetree();
  });
});
