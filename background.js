/*Copyright (c) 2014 ICRL

See the file license.txt for copying permission.*/
(function(){
    var signin = false;
    var uid = '';
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
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(request);
            switch(request.type){
                case "checkSignin":
                    sendResponse({signin: signin, uid: uid});
                    break;
                case "signin":
                    signin = true;
                    uid = request.data.uid;
                    sendResponse({result: 'ok'});
                    break;
                case "signout":
                    signin = false;
                    uid = '';
                    sendResponse({result: 'ok'});
                default:
            }
        });

//    chrome.storage.sync.set($scope.user, function(){
//        console.log("stored okly!");
//    });
//    chrome.storage.sync.get("email", function(result){
//        alert(result);
//    });
})();
