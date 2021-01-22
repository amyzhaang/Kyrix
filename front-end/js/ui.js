var PROJECT_NAME = "ui"; // HARD CODED

var project = {};

var canvasToIndex = {};
var nameToTransform = {};

// t = transform object
function getTransformName(t) {
    for (var name in nameToTransform) {
        if (t == nameToTransform[name]) {
            return name;
        }
    }
}

var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");

var labels = ["views", "canvases", "jumps"];

var currentEditCanvas, currentEditView, currentEditLayer, currentEditTransform, currentEditJump;

/**
 * serialize the body of a function into a string
 * @param func {string}
 * @returns {string}
 */
function getBodyStringOfFunction(func) {
    const bodyStart = func.indexOf("{") + 1;
    const bodyEnd = func.lastIndexOf("}");
    return "\n" + func.substring(bodyStart, bodyEnd) + "\n";
}

project.name = PROJECT_NAME;

project.config = {
    "serverPortNumber": "8000",
    "database": "psql",
    "serverName": "db",
    "userName": "kyrix",
    "password": "kyrix_password",
    "kyrixDbName": "kyrix"
};

project.views = [];
project.canvases = [];
project.jumps = [];

project.ssvs = [];
project.tables = [];
project.usmaps = [];
project.renderingParams = "{}";
project.styles = [];

// disable buttons once
document.getElementById("l-btn").disabled = true;
document.getElementById("t-btn").disabled = true;
document.getElementById("v-btn").disabled = true;
document.getElementById("j-btn").disabled = true;

function showAdd(l) {
    document.getElementById(l + "-btn").disabled = true;
    document.getElementById(l + "-div").style.display = "block";
}

function showEdit(l) {
    if (document.getElementById("e-" + l + "-div").style.display == "none") {
        document.getElementById("e-" + l + "-div").style.display = "block";
    }
}

function showEditor() {
    document.getElementById("editor_div").style.display = "block";
    editor.session.setMode("ace/mode/javascript");
}

$("#e-l-rendering").click(function() {
    document.getElementById("editor_div_title").innerHTML = "Edit rendering function";
    showEditor();
});

$("#l-rendering").click(function() {
    document.getElementById("editor_div_title").innerHTML = "Add rendering function";
    showEditor();
});

$("#e-t-func").click(function() {
    document.getElementById("editor_div_title").innerHTML = "Edit transform function";
    showEditor();
});

$("#t-func").click(function() {
    document.getElementById("editor_div_title").innerHTML = "Add transform function";
    showEditor();
});

function hideAdd(l) {
    document.getElementById(l + "-btn").disabled = false;
    document.getElementById(l + "-div").style.display = "none";
}

function hideEdit(l) {
    document.getElementById("e-" + l + "-div").style.display = "none";
}

function hideEditor() {
    editor.session.setValue("");
    document.getElementById("editor_div").style.display = "none";
}

function addCanvasSubmit() {
    var canvas = {};
    canvas.w = parseInt(document.getElementById("c-width").value);
    canvas.wSql = "";
    canvas.wLayerId = "";
    canvas.h = parseInt(document.getElementById("c-height").value);
    canvas.hSql = "";
    canvas.hLayerId = "";
    canvas.id = document.getElementById("c-id").value;
    canvas.layers = [];
    canvas.zoomInFactorX = 0;
    canvas.zoomInFactorY = 0;
    canvas.zoomOutFactorX = 100;
    canvas.zoomOutFactorY = 100;
    canvas.axes = "";
    canvas.axesSSVRPKey = "";
    canvas.pyramidLevel = 0;

    // save canvas index in project to access canvas later
    canvasToIndex[canvas.id] = project.canvases.length;

    // add canvas to project
    project.canvases.push(canvas);

    // add canvas to all dropdown lists for selecting canvases
    for (var select of document.getElementsByClassName("canvas-select")) {
        var option = document.createElement("option");
        option.text = canvas.id;
        select.add(option);
    }

    // show transform div if hidden
    if (document.getElementById("t-btn").disabled) {
        document.getElementById("t-btn").disabled = false;
    }

    // show view div if hidden
    if (document.getElementById("v-btn").disabled) {
        document.getElementById("v-btn").disabled = false;
    }

    document.getElementById("canvasForm").reset();
    hideAdd("c");
    updateTree();
    return false;
}

function addTransformSubmit() {
    var transform = {};
    transform.query = document.getElementById("t-sql").value;
    transform.db = document.getElementById("t-db").value;
    transform.columnNames = document.getElementById("t-colnames").value.split(",");
    transform.transformFunc = editor.getValue();
    transform.transformFuncBody = getBodyStringOfFunction(transform.transformFunc);
    transform.separable = document.getElementById("t-separable").checked;

    var name = document.getElementById("t-name").value;

    // save transform to retrieve later
    nameToTransform[name] = transform;

    // add transform to dropdown list when adding layers
    var option = document.createElement("option");
    option.text = name;
    document.getElementById("l-transform-select").add(option);

    // show layer div if hidden
    if (document.getElementById("l-btn").disabled) {
        document.getElementById("l-btn").disabled = false;
    }

    document.getElementById("transformForm").reset();
    hideAdd("t");
    hideEditor();
    updateTree();
    return false;
}

function addLayerSubmit() {
    var layer = {};
    layer.transform = nameToTransform[document.getElementById("l-transform-select").value];
    layer.isStatic = true; //document.getElementById("l-static").checked;
    // if false, need to add placement otherwise throws java.lang.NullPointerException at index.Indexer.getBboxCoordinates(Indexer.java:201)
    layer.fetchingScheme = "dbox";
    layer.deltaBox = true;
    layer.rendering = "";
    layer.tooltipColumns = [];
    layer.tooltipAliases = [];
    layer.indexerType = "";
    layer.ssvId = "";
    layer.usmapId = "";
    layer.rendering = editor.getValue();

    // add layer to canvas in project
    var canvasIndex = canvasToIndex[document.getElementById("l-canvas-select").value];
    project.canvases[canvasIndex].layers.push(layer);

    document.getElementById("layerForm").reset();
    hideAdd("l");
    hideEditor();
    updateTree();
    return false;
}

function addViewSubmit() {
    var view = {};
    view.id = document.getElementById("v-id").value;
    view.minx = parseInt(document.getElementById("v-minx").value);
    view.miny = parseInt(document.getElementById("v-miny").value);
    view.width = parseInt(document.getElementById("v-width").value);
    view.height = parseInt(document.getElementById("v-height").value);
    view.initialCanvasId = document.getElementById("v-initialcanvas").value;
    view.initialViewportX = parseInt(document.getElementById("v-initialx").value);
    view.initialViewportY = parseInt(document.getElementById("v-initialy").value);
    view.initialPredicates = "{}";

    project.views.push(view);

    document.getElementById("viewForm").reset();
    hideAdd("v");
    updateTree();
    return false;
}

function addJumpSubmit() {
    var jump = {};

    var optional = editor.getValue();

    jump.type = document.getElementById("j-type").value;
    jump.sourceId = document.getElementById("j-source").value;
    jump.destId = document.getElementById("j-dest").value;
    jump.selector = "selector" in optional ? optional.selector : "";
    jump.viewport = "viewport" in optional ? optional.viewport : "";
    jump.predicates = "predicates" in optional ? optional.predicates : "";
    jump.name = "name" in optional ? optional.name : jump.destId;
    jump.sourceViewId = "sourceView" in optional ? optional.sourceView.id : "";
    jump.destViewId = "destView" in optional ? optional.destView.id : "";
    jump.noPrefix = "noPrefix" in optional ? optional.noPrefix : false;
    jump.slideDirection = "slideDirection" in optional ? optional.slideDirection : 0;
    jump.slideSuperman = "slideSuperman" in optional ? optional.slideSuperman : false;

    project.jumps.push(jump);

    document.getElementById("jumpForm").reset();
    hideAdd("j");
    hideEditor();
    updateTree();
    return false;
}

function addJumpOptional() {
    function getJumpType() {return document.getElementById("j-type").value;}
    if (getJumpType() == "literal_zoom_in" || getJumpType() == "literal_zoom_out") {
        hideEditor();
        return;
    }
    document.getElementById("editor_div_title").innerHTML = "Add <a href='https://github.com/tracyhenry/Kyrix/wiki/API-Reference#jump' target='_blank'>optional arguments</a>";
    editor.setValue("{}");
    showEditor();
}

function color(d) {
    if (d.data.type == "layer") return "green";
    if (labels.includes(d.data.name)) return "blue";
    return "black";
}

function anchor(d) {
    if (d.data.name == PROJECT_NAME) return "end";
    if (labels.includes(d.data.name) || d.children) return "middle";
    return "start";
}

function x(d) {
    if (d.data.name == PROJECT_NAME) return -6;
    if (!d.children) return 6;
    return 0;
}

function y(d) {
    if (labels.includes(d.data.name) || d.data.name == "layers") return -7;
    if (d.data.name == PROJECT_NAME || !d.children) return 0;
    return 7;
}

function text(d) {
    if (d.data.type == "layer") return "layer_" + d.data.name[1];
    if (d.data.type == "jump") return d.data.name[0] + "->" + d.data.name[1];
    return d.data.name;
}

function updateTree() {
    d3.select("#tree_svg").remove();

    var view_children = [];
    var canvas_children = [];
    var jump_children = [];

    var projectTree = {
        name: PROJECT_NAME,
        children: [
            {name: "canvases",
                children: canvas_children},
            {name: "views",
                children: view_children},
            {name: "jumps",
                children: jump_children}
        ]
    };

    for (var view of project.views) {
        view_children.push({name: view.id, type: "view"});
    }

    for (var canvas of project.canvases) {
        var canvas_obj = {name: canvas.id, type: "canvas", children: []};
        for (var index in canvas.layers) {
            var layer_obj = {name: [canvas.id, index], type: "layer", children: [{name: getTransformName(canvas.layers[index].transform), type: "transform"}]};
            canvas_obj.children.push(layer_obj);
        }
        canvas_children.push(canvas_obj);
    }

    for (var jump of project.jumps) {
        jump_children.push({name: [jump.sourceId, jump.destId], type: "jump"});
    }

    var tree = d3.hierarchy(projectTree);

    var dx = 20;
    var dy = 40;

    var root = d3.tree().nodeSize([dx, dy])(tree);
    var marginLeft = 40;

    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("click to edit");

    var svg = d3.select("#graph-viz")
        .append("svg")
        .attr("id", "tree_svg")
        .attr("viewBox", [0, 0, 300, x1 - x0 + dx * 2])
        .style("overflow", "visible");

    var g = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("transform", `translate(${marginLeft},${dx - x0})`);

    var link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
    .selectAll("path")
        .data(root.links())
        .join("path")
            .attr("stroke-opacity", 1)
            .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

    var node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("class", "node_class")
    .selectAll("g")
        .data(root.descendants())
        .join("g")
            .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("fill", "#999")
        .attr("r", 2.5);

    node.append("text")
        .attr("fill", d => color(d))
        .attr("dy", "0.31em")
        .attr("x", d => x(d))
        .attr("y", d => y(d))
        .attr("text-anchor", d => anchor(d))
        .text(d => text(d))
        .on("mouseover", function(){return tooltip.style("visibility", "visible");})
        .on("mousemove", function(){return tooltip.style("top",
            (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
        .on("click", d => edit(d));

    var svg_box = document.getElementById("tree_svg").viewBox.baseVal;
    document.getElementById("graph-viz").style.width = svg_box.width + "px";
    document.getElementById("graph-viz").style.height = svg_box.height + "px";
}

function edit(d) {
    if (d.data.type == "canvas") {
        editCanvas(d);
    } else if (d.data.type == "view") {
        editView(d);
    } else if (d.data.type == "layer") {
        editLayer(d);
    } else if (d.data.type == "transform") {
        editTransform(d);
    } else if (d.data.type == "jump") {
        editJump(d);
    }
}

function editCanvas(d) {
    for (var canvas of project.canvases) {
        if (canvas.id == d.data.name) {
            currentEditCanvas = canvas;
            document.getElementById("e-c-width").value = canvas.w;
            document.getElementById("e-c-height").value = canvas.h;
            document.getElementById("e-c-id").value = canvas.id;
            showEdit("c");
            break;
        }
    }
}

function editView(d) {
    for (var view of project.views) {
        if (view.id == d.data.name) {
            currentEditView = view;
            document.getElementById("e-v-id").value = view.id;
            document.getElementById("e-v-minx").value = view.minx;
            document.getElementById("e-v-miny").value = view.miny;
            document.getElementById("e-v-width").value = view.width;
            document.getElementById("e-v-height").value = view.height;
            document.getElementById("e-v-initialcanvas").value = view.initialCanvasId;
            document.getElementById("e-v-initialx").value = view.initialViewportX;
            document.getElementById("e-v-initialy").value = view.initialViewportY;
            showEdit("v");
            break;
        }
    }
}

function editLayer(d) {
    var canvas_name = d.data.name[0];
    var layer_index = d.data.name[1];
    for (var canvas of project.canvases) {
        if (canvas_name == canvas.id) {
            currentEditLayer = canvas.layers[layer_index];
            document.getElementById("e-l-transform-select").value = getTransformName(currentEditLayer.transform);
            document.getElementById("e-l-static").checked = currentEditLayer.isStatic;
            document.getElementById("e-l-canvas-select").value = canvas_name;
            showEdit("l");
            break
        }
    }
}

function editTransform(d) {
    currentEditTransform = nameToTransform[d.data.name];
    if (currentEditTransform) {
        document.getElementById("e-t-name").value = d.data.name;
        document.getElementById("e-t-sql").value = currentEditTransform.query;
        document.getElementById("e-t-db").value = currentEditTransform.db;
        document.getElementById("e-t-colnames").value = currentEditTransform.columnNames.join(",");
        document.getElementById("e-t-separable").checked = currentEditTransform.separable;
        editor.setValue(currentEditTransform.transformFunc);
        showEdit("t");
    }
}

function editJump(d) {
    for (var jump of project.jumps) {
        if (jump.sourceId == d.data.name[0] && jump.destId == d.data.name[1]) {
            currentEditJump = jump;
            document.getElementById("e-j-type").value = jump.type;
            document.getElementById("e-j-source").value = jump.sourceId;
            document.getElementById("e-j-dest").value = jump.destId;
            showEdit("j");
            break
        }
    }
}

function editCanvasSubmit() {
    if (currentEditCanvas) {
        currentEditCanvas.w = parseInt(document.getElementById("e-c-width").value);
        currentEditCanvas.h = parseInt(document.getElementById("e-c-height").value);
        currentEditCanvas.id = document.getElementById("e-c-id").value;
        updateTree();
    }
    currentEditCanvas = undefined;
    hideEdit("c");
    return false;
}

function editLayerSubmit() {
    if (currentEditLayer) {
        currentEditLayer.transform = nameToTransform[document.getElementById("e-l-transform-select").value];
        currentEditLayer.isStatic = true; //document.getElementById("e-l-static").checked;
        currentEditLayer.rendering = editor.getValue();
        updateTree();
    }
    currentEditLayer = undefined;
    hideEdit("l");
    hideEditor();
    return false;
}

function editViewSubmit() {
    if (currentEditView) {
        currentEditView.id = document.getElementById("e-v-id").value;
        currentEditView.minx = parseInt(document.getElementById("e-v-minx").value);
        currentEditView.miny = parseInt(document.getElementById("e-v-miny").value);
        currentEditView.width = parseInt(document.getElementById("e-v-width").value);
        currentEditView.height = parseInt(document.getElementById("e-v-height").value);
        currentEditView.initialCanvasId = document.getElementById("e-v-initialcanvas").value;
        currentEditView.initialViewportX = parseInt(document.getElementById("e-v-initialx").value);
        currentEditView.initialViewportY = parseInt(document.getElementById("e-v-initialy").value);
        updateTree();
    }
    currentEditView = undefined;
    hideEdit("v");
    return false;
}

function editTransformSubmit() {
    if (currentEditTransform) {
        currentEditTransform.query = document.getElementById("e-t-sql").value;
        currentEditTransform.db = document.getElementById("e-t-db").value;
        currentEditTransform.columnNames = document.getElementById("e-t-colnames").value.split(",");
        currentEditTransform.separable = document.getElementById("e-t-separable").checked;
        currentEditTransform.transformFunc = editor.getValue();
        currentEditTransform.transformFuncBody = getBodyStringOfFunction(currentEditTransform.transformFunc);
        updateTree();
    }
    currentEditTransform = undefined;
    hideEdit("t");
    hideEditor();
    return false;
}

function editJumpSubmit() {
    if (currentEditJump) {
        currentEditJump.type = document.getElementById("e-j-type").value;
        currentEditJump.sourceId = document.getElementById("e-j-source").value;
        currentEditJump.destId = document.getElementById("e-j-dest").value;
        updateTree();
    }
    currentEditJump = undefined;
    hideEdit("j");
    hideEditor();
    return false;
}

function deleteCanvas() {
    if (currentEditCanvas) {
        for (var select of document.getElementsByClassName("canvas-select")) {
            for (var i in select.options) {
                if (select.options[i].text == currentEditCanvas.id) {
                    select.remove(i);
                    break;
                }
            }
        }
        for (var i in project.canvases) {
            if (project.canvases[i] == currentEditCanvas) {
                project.canvases.splice(i, 1);
                break;
            }
        }
        updateTree();
    }
    currentEditCanvas = undefined;
    hideEdit("c");
    return false;
}

function deleteLayer() {
    if (currentEditLayer) {
        for (var canvas of project.canvases) {
            for (var i in canvas.layers) {
                if (canvas.layers[i] == currentEditLayer) {
                    canvas.layers.splice(i, 1);
                    break;
                }
            }
        }
        updateTree();
    }
    currentEditLayer = undefined;
    hideEdit("l");
    hideEditor();
    return false;
}

function deleteView() {
    if (currentEditView) {
        for (var i in project.views) {
            if (project.views[i] == currentEditView) {
                project.views.splice(i, 1);
                break;
            }
        }
        updateTree();
    }
    currentEditView = undefined;
    hideEdit("v");
    return false;
}

function deleteTransform() {
    if (currentEditTransform) {
        for (var canvas of project.canvases) {
            for (var layer of canvas.layers) {
                if (layer.transform == currentEditTransform) {
                    layer.transform = null;
                    break;
                }
            }
        }
        updateTree();
    }
    currentEditTransform = undefined;
    hideEdit("t");
    hideEditor();
    return false;
}

function deleteJump() {
    if (currentEditJump) {
        for (var i in project.jumps) {
            if (project.jumps[i] == currentEditJump) {
                project.jumps.splice(i, 1);
                break;
            }
        }
        updateTree();
    }
    currentEditJump = undefined;
    hideEdit("j");
    hideEditor();
    return false;
}

function exportProject(el) {
    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));

    var el = document.getElementById("export-el");

    el.setAttribute("href", "data:"+data);
    el.setAttribute("download", "project.json");

    el.click();
}

function importProjectButton() {
    document.getElementById("upload_div").style.display == "none" ?
        document.getElementById("upload_div").style.display = "flex" :
        document.getElementById("upload_div").style.display = "none";
}

function importProject() {
    var files = document.getElementById('upload_file').files;
    if (files.length <= 0) return false;

    var fr = new FileReader();

    fr.onload = function(e) {
        project = JSON.parse(e.target.result);

        var count = 0;
        for (var i in project.canvases) {
            var canvas = project.canvases[i];
            canvasToIndex[canvas.id] = i;
            for (var select of document.getElementsByClassName("canvas-select")) {
                var option = document.createElement("option");
                option.text = canvas.id;
                select.add(option);
            }

            var select = document.getElementById("e-l-transform-select");
            for (var layer of canvas.layers) {
                var name = "t" + count;
                nameToTransform[name] = layer.transform;
                count += 1;

                var option = document.createElement("option");
                option.text = name;
                select.add(option);
            }
        }

        sendProject();
        updateTree();
    }
    fr.readAsText(files.item(0));
    document.getElementById("upload_div").style.display = "none";
    return false;
}


function sendProject() {
    console.log("send project");

    $.ajax({
        type: "POST",
        url: "/project",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded',
                   'X-Kyrix-Force-Recompute' : '1' },
        data: JSON.stringify(project),
        success: function(data) {
            console.log("success");
            console.log(data);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log("fail");
            console.log(XMLHttpRequest, textStatus, errorThrown);
        }
    });

}