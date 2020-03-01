
function onInit() {
    let editor = this;
    let userObject = new Object();

    let parent = editor.graph.getDefaultParent();
    let model = editor.graph.model;
    model.beginUpdate();
    try {
        let v = editor.graph.insertVertex(parent, null, userObject, 20, 20, 80, 30);
        console.dir(v);
    }
    finally {
        model.endUpdate();
    }
}

