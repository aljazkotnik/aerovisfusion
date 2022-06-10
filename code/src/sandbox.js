/*
	What do I actually want to do?
	
	1) Streamlet movement
	  Option 1: 
	    dashOffset allows movement to be incremented. The velocity needs to be calulated for every point from scratch. Geometry points spacin cannot be changed to account for this - the sampling would filter out some behavior. After the velocity is retrieved it needs to be converted into the dashOffset value - this should be a simple linear mapping.
		
	  Option 2: 
	    update position and send it to the GPU in a loop? I have the positions recomputed, so I can just advance using "line.geometry.setDrawRange(0, line.age)". Have to figure out how to advance the movement with respect to time.
		
		
		
		
	  NOTE: ParaView can draw animated streamlines - but they say something about the implementation (or something - storage?) being 2D, which makes them disappear when changing the camera view. The same happens in PolarGlobe also!
		
		
	2) Color shows some flow property
	  For LineMesh I need to create a texture and the corresponding mapping to color the line using a flow property.
      Alternately I could do a ShaderMaterial to implement color - allows elimination of THREE.MeshLine.
		
		
	3) length of streamlet shows measure of velocity.
	  This is to some extent inherent in the indexing approach - faster flow regions will have longer sections associated with it. Maybe keep a time variable with the data, and repeat every
	
	
	*/


import * as THREE from 'three';
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three.meshline';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";



var camera, scene, light, renderer, controls;
var lineStreamlines = [];
var lineMeshStreamlines = [];
var lineShaderStreamlines = [];


init();
animate();


function init(){
	setupEnvironment();
	
	addLine();
	addLineMesh();
	addShaderLine();
	
	addOrbitControls();
	
	console.log(lineStreamlines, lineMeshStreamlines, lineShaderStreamlines)
} // init



function setupEnvironment(){
	/* SCENE, CAMERA, and LIGHT setup.
	camera inputs: view angle, aspect ratio, near, far.
	desired domain to show = x: [0, 0.6], y: [100, 100.4], z: [0, 0.25].
	*/
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( 0, 0, -2 );

	scene = new THREE.Scene();

	// With the normal material the light is not needed - but will be needed later.
	light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( 1, 1, 1 ).normalize();
	scene.add( light );
		

	// SETUP THE ACTUAL LOOP
	// renderer.domElement is created in renderer.
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
} // setup Environment


function addLine(){
	
	let samples = hilbert3D( new THREE.Vector3( 0, 0, 0 ), 1.0, 1, 0, 1, 2, 3, 4, 5, 6, 7 );
	
	const geometrySpline = new THREE.BufferGeometry().setFromPoints( samples );
    
	const material = new THREE.LineDashedMaterial( { color: 0xffffff, dashSize: 0.1, gapSize: 0.05 } );

	const line = new THREE.Line( geometrySpline,  material);
	line.computeLineDistances();

	lineStreamlines.push( line );
	scene.add( line );
	
} // addLine


function addLineMesh(){

	const points = [];
	for (let j = 0; j < Math.PI; j += 2 * Math.PI / 100) {
	  points.push(new THREE.Vector3(Math.cos(j), Math.sin(j), 0));
	}
	const geometry = new THREE.BufferGeometry().setFromPoints(points);
	const line = new MeshLine();
	line.setGeometry(geometry);



	const material = new MeshLineMaterial({
		transparent: true,
		depthTest: false,
		lineWidth: 0.1,
		color: 0xff00ff,
		dashArray: 1,
		dashRatio: 0.95
	});


	const mesh = new THREE.Mesh(line, material);
	
	lineMeshStreamlines.push(mesh)
	scene.add(mesh);

} // addLineMesh



/*
IMPORTANT!!!!!
The speed increment should not happen every render call - render calls are irregular. Instad it should be controlled by a clock.

Artefacts that appear are faster line movement when controls change the view.
*/
function updateLineMesh(){
	
	
	
	lineMeshStreamlines.forEach(line=>{
		// changing the dashOffset creates animation.
		line.material.dashOffset += 0.01;
	}) // forEach
} // updatLineMesh






function addShaderLine(){
	
	
	var vertexShader = `
      precision mediump float;
      precision mediump int;
      attribute vec4 color;
      varying vec4 vColor;
      void main()    {
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;
    var fragmentShader = `
      precision mediump float;
      precision mediump int;
      varying vec4 vColor;
      void main()    {
        vec4 color = vec4( vColor );
        gl_FragColor = color;
      }
    `;
	


	var geometry = new THREE.BufferGeometry()


	var points = [];
	for (let j=0; j<100; j++) {
	  // Data will go to 1D array, so just make it 1D already?
	  points.push( Math.cos(j*Math.PI/100) ); // x
	  points.push( Math.sin(j*Math.PI/100) ); // y
	  points.push( 0.1 ); // z
	} // for
	var positions = new Float32Array(points);
   
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

	
	// Colors indicated the age of the line. Keep this for now.
    var colors = new Array( points.length ).fill(1);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4, true));


    var material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    });


	// Make the streamlines;
    for(let p=0; p<10; p++) {
      let line = new THREE.Line(geometry.clone(), material.clone());
      line.age = 0;
      line.maxAge = 100-1;
		
	  
	  lineShaderStreamlines.push(line);
	  scene.add(line)
    }
    
	
	
} // addShaderLine

function updateShaderLine(){
	// Fadeout was achieved by changing hte color on-the-go....
	// That was a lot of work being done all the time - constant traversal of the data, constant communication with the GPU...
	
	lineShaderStreamlines.forEach(line=>{
		// Even if I have the streamlines precomputed I still only move based on hte index position in hte array - still cannot simulate the actual velocity... Ok, but does it just advance to the point while keeping hte ones in hte back?
		
		line.age++;
		
		if(line.age>line.maxAge){
			line.age = 0;
		}
		
		// Could I store time simultaneously, and then just look up the indices that correspond to the time? Then i can use the min and max index to indicate the line in between, and the line will grow automatically when the speed is larger?
		line.geometry.setDrawRange(Math.max(0, line.age-10), line.age)
		
		
	})
} // updateShaderLine





function addOrbitControls(){
	controls = new OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render );
	controls.target.set( 0, 0, 0 )
} // addOrbitControls




function hilbert3D( center = new THREE.Vector3( 0, 0, 0 ), size = 10, iterations = 1, v0 = 0, v1 = 1, v2 = 2, v3 = 3, v4 = 4, v5 = 5, v6 = 6, v7 = 7 ) {

	// Default Vars
	const half = size / 2;

	const vec_s = [
		new THREE.Vector3( center.x - half, center.y + half, center.z - half ),
		new THREE.Vector3( center.x - half, center.y + half, center.z + half ),
		new THREE.Vector3( center.x - half, center.y - half, center.z + half ),
		new THREE.Vector3( center.x - half, center.y - half, center.z - half ),
		new THREE.Vector3( center.x + half, center.y - half, center.z - half ),
		new THREE.Vector3( center.x + half, center.y - half, center.z + half ),
		new THREE.Vector3( center.x + half, center.y + half, center.z + half ),
		new THREE.Vector3( center.x + half, center.y + half, center.z - half )
	];

	const vec = [
		vec_s[ v0 ],
		vec_s[ v1 ],
		vec_s[ v2 ],
		vec_s[ v3 ],
		vec_s[ v4 ],
		vec_s[ v5 ],
		vec_s[ v6 ],
		vec_s[ v7 ]
	];

	// Recurse iterations
	if ( -- iterations >= 0 ) {

		return [
			...hilbert3D( vec[ 0 ], half, iterations, v0, v3, v4, v7, v6, v5, v2, v1 ),
			...hilbert3D( vec[ 1 ], half, iterations, v0, v7, v6, v1, v2, v5, v4, v3 ),
			...hilbert3D( vec[ 2 ], half, iterations, v0, v7, v6, v1, v2, v5, v4, v3 ),
			...hilbert3D( vec[ 3 ], half, iterations, v2, v3, v0, v1, v6, v7, v4, v5 ),
			...hilbert3D( vec[ 4 ], half, iterations, v2, v3, v0, v1, v6, v7, v4, v5 ),
			...hilbert3D( vec[ 5 ], half, iterations, v4, v3, v2, v5, v6, v1, v0, v7 ),
			...hilbert3D( vec[ 6 ], half, iterations, v4, v3, v2, v5, v6, v1, v0, v7 ),
			...hilbert3D( vec[ 7 ], half, iterations, v6, v5, v2, v1, v0, v3, v4, v7 )
		];

	}

	// Return complete Hilbert Curve.
	return vec;

} // hilbert3d



function animate() {
	requestAnimationFrame( animate );
	// controls.update();
	render();
} // animate

function render() {
	
	// Lines should update with respect to time, not repeated render calls.
	
	
	// Animate the movmnt of the line;
	updateLineMesh();
	updateShaderLine();
	
	renderer.render( scene, camera );
} // render