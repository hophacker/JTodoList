(function(){
//    var sendR;
//    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
//        sendR = sendResponse;
//    });
    chrome.extension.onConnect.addListener(function(port) {
        port.onMessage.addListener(function(msg) {
            request = JSON.parse(msg);
            switch(request.type){
                case "setData":
                    chrome.storage.sync.set(request.data, function(){
                        port.postMessage(JSON.stringify({status: 0}));
                    });
                    break;
                case "getData":
                    chrome.storage.sync.get(request.name, function(result){
                        port.postMessage(JSON.stringify({status: 0, result: result}));
                    })
                    break;
                default:
            }


        });
    });

//    chrome.storage.sync.set($scope.user, function(){
//        console.log("stored okly!");
//    });
//    chrome.storage.sync.get("email", function(result){
//        alert(result);
//    });
})();
