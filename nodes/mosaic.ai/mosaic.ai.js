module.exports = function(RED) {
    function MosaicNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var nodeMethod = config.method || "GET";
        node.on('input', function(data) {
            var context = this.context();
            data.payload = data.payload;
            console.log('Printing config : -> ', config);
            console.log('Printing input data revieved : -> ', data);

           
            var connectors = config.connectors;
            var mappers = config.mappers;
            var nlp;
            var cs;
            connectors.forEach(function(element) {
                if(element.type === 1){
                    nlp = element
                }else{
                    cs = element
                }
            });
            if(config.isConnector){
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
    RED.nodes.registerType("mosaic.ai",MosaicNode,{});
}