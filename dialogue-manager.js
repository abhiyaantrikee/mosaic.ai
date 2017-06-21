module.exports = function(RED) {
    function DialogueMangerNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var nodeMethod = config.method || "GET";
        node.on('input', function(data) {
            data.payload = data.payload;
            var nlp = config.parameters.NLP;
            var cs = config.parameters.CS;
            if(config.parameters.isConnector){
                if(!nlp.url || !cs.url ){
                    node.error(RED._("http.errors.no-url"), data);
                    node.status({
                        fill: "red",
                        shape: "ring",
                        text: (RED._("http.errors.no-url"))
                    });
                    return;
                }else {
                    // request to be made using request npm module.
                }
            }
            node.send(data);
        });
    }
    RED.nodes.registerType("dialogue-manager",DialogueMangerNode,{});
}