var canvas;
var gl;
var program;

var modelViewMatrix = mat4();
var projectionMatrix = mat4();

var modelViewMatrixLoc;
var projectionMatrixLoc;

var mvStack = [];

var numVertices=36;

var TORSO_HEIGHT      = 6.0;
var TORSO_WIDTH       = 4.0;
var HEAD_HEIGHT		  = 1.8;
var HEAD_WIDTH		  = 1.8;
var UPPER_ARM_HEIGHT  = 3.0;
var UPPER_ARM_WIDTH   = 1.2;
var LOWER_ARM_HEIGHT  = 2.5;
var LOWER_ARM_WIDTH   = 0.75;
var UPPER_LEG_HEIGHT  = 3.5;
var UPPER_LEG_WIDTH   = 1.5;
var LOWER_LEG_HEIGHT  = 2.75;
var LOWER_LEG_WIDTH   = 1.1;

var vertices = [
        vec3( -0.5, -0.5,  0.5 ),
        vec3( -0.5,  0.5,  0.5 ),
        vec3(  0.5,  0.5,  0.5 ),
        vec3(  0.5, -0.5,  0.5 ),
        vec3( -0.5, -0.5, -0.5 ),
        vec3( -0.5,  0.5, -0.5 ),
        vec3(  0.5,  0.5, -0.5 ),
        vec3(  0.5, -0.5, -0.5 )
    ];
	
var vertexColors = [
        vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
        vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
        vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
        vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
        vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
        vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
        vec4( 1.0, 1.0, 1.0, 1.0 ),  // white
        vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
    ];
	
var indices = [
    1, 0, 3,
    3, 2, 1,
    2, 3, 7,
    7, 6, 2,
    3, 0, 4,
    4, 7, 3,
    6, 5, 1,
    1, 2, 6,
    4, 5, 6,
    6, 7, 4,
    5, 4, 0,
    0, 1, 5
];

const at = vec3(0, 0, 0);
var eye;
var theta  = 0.0;
var phi    = 0.0;
var cBuffer;
var colors = [];
var up = vec3(0, 1, 0);
var aspect;
var fovy = 45.0;
var flag=0;
var radius = 25;

window.onload = function init() {
	canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
	
	aspect = canvas.width/canvas.height;

    gl.enable(gl.DEPTH_TEST);;
	
	window.onresize = 
	function (event) {
		var min = innerWidth;
		if(innerHeight < min) {
			min = innerHeight;
		}
		if(min < canvas.width || min < canvas.height) {
			console.log("1");
			gl.viewport(0, canvas.height-min, min, min);
			render();
		}
		if(innerWidth > min && innerHeight > min) {
			gl.viewport(0, 0, canvas.width, canvas.height);
			render();
		}
	}
	
	window.onkeydown =
	function (event) {
		var key = String.fromCharCode(event.keyCode);
		switch(key) {
			case "W":
			console.log("W");
			theta+=0.1;
			render();
			break;
			
			case "A":
			console.log("A");
			phi-=0.1;
			render();
			break;
			
			case "S":
			console.log("S");
			theta-=0.1;
			render();
			break;
			
			case "D":
			console.log("D");
			phi+=0.1;
			render();
			break;
			
			case "P":
			console.log("P");
			if(flag==0) {
				flag=1;
				projectionMatrix = perspective(fovy, aspect, 0.5, 100);
				gl.uniformMatrix4fv( projectionMatrixLoc,  false, flatten(projectionMatrix) );
				render();
			}
			else {
				flag=0;
				projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
				gl.uniformMatrix4fv( projectionMatrixLoc,  false, flatten(projectionMatrix) );
				render();
			}
			break;
		}
	}

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
	
	var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);
	
	fillColors(0); // Initialize first color to red.
	
	cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
	
	var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
	
	projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
	projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
	gl.uniformMatrix4fv( projectionMatrixLoc,  false, flatten(projectionMatrix) );
	
	render();
}

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

function render() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	
	if(flag==0) eye = vec3(Math.sin(phi), Math.sin(theta), Math.cos(phi));
	else eye = vec3(radius*Math.sin(phi), radius*Math.sin(theta), radius*Math.cos(phi));
	modelViewMatrix = lookAt(eye, at, up);
	
	torso();
	
	mvStack.push(modelViewMatrix);
	modelViewMatrix = mult(modelViewMatrix, translate(0.0, TORSO_HEIGHT, 0.0));
	head();
	
	modelViewMatrix = mvStack.pop();
	mvStack.push(modelViewMatrix);
	modelViewMatrix = mult(modelViewMatrix, translate(TORSO_WIDTH/2, 3 * TORSO_HEIGHT/4 - 0.2, 0.0));
	rightUpperArm();
	
	modelViewMatrix = mvStack.pop();
	mvStack.push(modelViewMatrix);
	modelViewMatrix = mult(modelViewMatrix, translate(-TORSO_WIDTH/2, 3 * TORSO_HEIGHT/4 - 0.2, 0.0));
	leftUpperArm();
	
	modelViewMatrix = mvStack.pop();
	mvStack.push(modelViewMatrix);
	modelViewMatrix = mult(modelViewMatrix, translate(TORSO_WIDTH/4, 0.0, 0.0));
	rightUpperLeg();
	
	modelViewMatrix = mvStack.pop();
	mvStack.push(modelViewMatrix);
	modelViewMatrix = mult(modelViewMatrix, translate(-TORSO_WIDTH/4, 0.0, 0.0));
	leftUpperLeg();
	
	modelViewMatrix = mvStack.pop();
}

function torso() {
	fillColors(1);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(TORSO_WIDTH, TORSO_HEIGHT, TORSO_WIDTH);
	var instanceMatrix = mult(translate(0.0, 0.5 * TORSO_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
}

function head() {
	fillColors(4);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(HEAD_WIDTH, HEAD_HEIGHT, HEAD_WIDTH);
	var instanceMatrix = mult(translate(0.0, 0.5 * HEAD_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
}

function rightUpperArm() {
	fillColors(3);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(UPPER_ARM_WIDTH, UPPER_ARM_HEIGHT, UPPER_ARM_WIDTH);
	var instanceMatrix = mult(translate(0.5 * UPPER_ARM_WIDTH, 0.0, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
	
	modelViewMatrix = mult(modelViewMatrix, translate(0.0, -0.5 * UPPER_ARM_HEIGHT, 0.0));
	
	rightLowerArm();
}

function leftUpperArm() {
	fillColors(3);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(UPPER_ARM_WIDTH, UPPER_ARM_HEIGHT, UPPER_ARM_WIDTH);
	var instanceMatrix = mult(translate(-0.5 * UPPER_ARM_WIDTH, 0.0, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
	
	modelViewMatrix = mult(modelViewMatrix, translate(0.0, -0.5 * UPPER_ARM_HEIGHT, 0.0));
	
	leftLowerArm();
}

function rightLowerArm() {
	fillColors(7);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
	var instanceMatrix = mult(translate(0.5 * UPPER_ARM_WIDTH, -0.5 * LOWER_ARM_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
}

function leftLowerArm() {
	fillColors(7);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
	var instanceMatrix = mult(translate(-0.5 * UPPER_ARM_WIDTH, -0.5 * LOWER_ARM_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
}

function rightUpperLeg() {
	fillColors(5);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(UPPER_LEG_WIDTH, UPPER_LEG_HEIGHT, UPPER_LEG_WIDTH);
	var instanceMatrix = mult(translate(0.0, -0.5 * UPPER_LEG_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
	
	modelViewMatrix = mult(modelViewMatrix, translate(0.0, -UPPER_LEG_HEIGHT, 0.0));
	
	rightLowerLeg();
}

function leftUpperLeg() {
	fillColors(5);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(UPPER_LEG_WIDTH, UPPER_LEG_HEIGHT, UPPER_LEG_WIDTH);
	var instanceMatrix = mult(translate(0.0, -0.5 * UPPER_LEG_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
	
	modelViewMatrix = mult(modelViewMatrix, translate(0.0, -UPPER_LEG_HEIGHT, 0.0));
	
	leftLowerLeg();
}

function rightLowerLeg() {
	fillColors(2);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(LOWER_LEG_WIDTH, LOWER_LEG_HEIGHT, LOWER_LEG_WIDTH);
	var instanceMatrix = mult(translate(0.0, -0.5 * LOWER_LEG_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
}

function leftLowerLeg() {
	fillColors(2);
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
	var s = scale4(LOWER_LEG_WIDTH, LOWER_LEG_HEIGHT, LOWER_LEG_WIDTH);
	var instanceMatrix = mult(translate(0.0, -0.5 * LOWER_LEG_HEIGHT, 0.0), s);
	var t = mult(modelViewMatrix, instanceMatrix);
	gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
	gl.drawElements( gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0 );
}

function fillColors() {
	for(var i=0; i<numVertices; i++) {
		colors[i] = vertexColors[arguments[0]];
	}
}