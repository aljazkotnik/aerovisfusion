/*
Drawing the delta wing in THREE.js

WING GEOMETRY

MISSING: wing geometry definition pipeline
The wing geometry was manually extracted from the grid data using ParaView. The wing data is in the vtk format because THREE.js supports a VTKLoader.




STREAMLINES

With statically drawn streamlines as the number of lines increases occlusion prevents the user from seeing the flow feature. The streamlets allow the features to be visible.

Maybe it's easier to just precompute streamlines and store that data to be used in the visualisation?

A Gaussian process regression model could be used to select some sampling points, e.g. 1000 of them, and these can be used as the seed points?

- convertpoints to lines
- check how many lines work smoothly
- update the line data on-the-go
- make the update on the GPU
- adapt for CFD data




The particle stepping approach works by finding the relevant velocity for each point the particle takes. For large grids this is slow. Octtrees can be used to reduce the search time, but still. This is similar to how streamlines are calculated in hte first place.

Another option is to precalculate hte lines, and then just move particles along those lines.




The CFD domain is essentially a box. The streamlines cannot intersect with the wing. So the particles only need to check whether they are within hte domain bounding box or not.

Other approach is the Octtree. this would be required for internal passages. No - not even there, the particles would never leave the domain anyway - they just follow the closest point. Provided that their velocity is low enough that they don't overshoot any nodes.

*/



import * as THREE from "three";
import { ArcballControls } from "three/examples/jsm/controls/ArcballControls.js";

// Scene elements
import ColorBar from "./GUI/ColorBar.js";
import ContouredMesh from "./components/ContouredMesh.js";
import {text2csv, csvStreamline2jsonStreamline} from "./helpers.js";



// GUI
import { html2element } from "./helpers.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "stats.js";



// Scene items
var camera, arcballcontrols, transformcontrols;
var sceneWebGL, rendererWebGL;


// GUI items
var elementsGUI;
var stats;


/*
wing domain roughly = {
	x = [0, 0.7]
	y = [100.1, 100.4]
	z = [0, 0.3]
}
*/
const domainMidPoint = new THREE.Vector3(0.4, 100.5, 0);
const focusInitialPoint = new THREE.Vector3(0.345, 100.166, 0.127);
const cameraInitialPoint = new THREE.Vector3(focusInitialPoint.x, focusInitialPoint.y, focusInitialPoint.z + 1);



// Colorbar
const color = new THREE.Color();
const colorbar = new ColorBar(0.14, 0.44);
colorbar.colormap = "d3Spectral";





// Arrays holding hte items.
// var streamlines = [];
var streamlineLoadPromise;
var lineShaderStreamlines = [];
var streamlinegeometry, streamlinematerial;
var streamlineOn = true;


// Create a cyclic IntegrationTime clock - not cyclic before time should be linear;
// So instead there should be a remainder that gets transformed.
const t0 = performance.now();
const IntegrationSpan = [-0.009302791000000, 0.014919188];
const CycleDuration = 20*1e3; // [ms];

// Let's say that it should span the integration domain in
function CurrentIntegrationTime(){
	return ((performance.now() - t0) % CycleDuration)/CycleDuration
} // CurrentIntegrationTime


// I want time to run in ms, and the drawing should be updated based on that. On hte other hand the lines should actually be drawn at different times, to allow them to be offset in space. So I should keep the clock in the [0-1] cycle, and then convert the time for each line separately.





init();
animate();


function init() {


	

	setupScene();
	addArcballControls();
	setupHUD();
	

	

	// Data domain viewframe.
	// The box is positioned by its centerpoint.
	/*
	const box = new THREE.BoxGeometry( 1.4, 1, 2 );
	const object = new THREE.Mesh( box, new THREE.MeshBasicMaterial( { color: 0x0FC3D6, wireframe: true } ) );
	object.position.set( domainMidPoint.x, domainMidPoint.y, domainMidPoint.z )
	scene.add( object );
	*/
	
	// Add in the wing.
	addWingGeometry()
	
	
	// Add the streamlines.
	addShaderStreamlines();
	


	window.addEventListener( 'resize', onWindowResize );
} // init


// SCENE.
function setupScene(){
	
	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 20000 );
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	
	// SCENES
	sceneWebGL = new THREE.Scene();
	sceneWebGL.name = "sceneWebGL";
	
	
	// LIGHTS - ambient light seems to be sufficient.
	var ambientLight = new THREE.AmbientLight( 0xaaaaaa );
	sceneWebGL.add( ambientLight );

	
	
    // RENDERERS
    rendererWebGL = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererWebGL.setClearColor( 0xFFFFFF, 0 );
    rendererWebGL.setPixelRatio( window.devicePixelRatio );
    rendererWebGL.setSize( window.innerWidth, window.innerHeight );
    rendererWebGL.shadowMap.enabled = true;
    rendererWebGL.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	rendererWebGL.domElement.style.zIndex = 1;
    rendererWebGL.name = "rendererWebGL";
	
	
	// APPEND RENDERES
	document.getElementById('webgl').appendChild( rendererWebGL.domElement );
	
} // setupScene






// GEOMETRY
function addWingGeometry(){
	
	
	
	// Load the pressure surface. Encoding prescribed in Matlab. Float64 didn't render.
	let verticesPromise = fetch("./assets/deltawing/wing/vertices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Float32Array(ab)}); // float32
	let indicesPromise = fetch("./assets/deltawing/wing/indices.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Uint32Array(ab)}); // uint32
	let valuePromise = fetch("./assets/deltawing/wing/mach.bin")
	  .then(res=>res.arrayBuffer())
	  .then(ab=>{return new Float32Array(ab)}); // float32
	  
	  
	const dataPromise = Promise.all([verticesPromise, indicesPromise, valuePromise]);
	  

	const m = new ContouredMesh( "deltawing", dataPromise, colorbar.uniforms );
	
	m.created.then(mesh=>{
		mesh.name = "Delta wing";
		sceneWebGL.add( mesh );
		
		// Subscribe the mesh material to the colorbar for future changes.
		function updateMeshColorbarTexture(mesh){
			/* Uniforms controlled by the colorbar GUI:
			obj.uniforms = {
				u_colorbar: { type: "t", value: new CanvasTexture( canvas ) },
				u_thresholds: {value: initialThresholds },
				u_n_thresholds: {value: obj.n },
				u_isolines_flag: {value: false },
				u_contours_flag: {value: true }
			};
			*/
			mesh.material.uniforms.u_colorbar.value.needsUpdate = true;
		} // updateMeshColorbarTexture
		colorbar.subscribers.push([mesh, updateMeshColorbarTexture]);
		
		
		/*
		// Add GUI controllers.
		const guiconfig = m.config;
		const folder = elementsGUI.addFolder( "Geometry: " + trimStringToLength(guiconfig.name , 27) );
		
		folder.add( guiconfig, "visible" ); 	   // boolean
		
		
		guiconfig.remove = function(){
			folder.destroy();
			sceneWebGL.remove( mesh );
		} // remove
		folder.add( guiconfig, "remove" );      // button
		*/
	
	
		// var vnh = new VertexNormalsHelper( mesh, 1, 0xff0000 );
		// scene.add( vnh );
		// console.log(mesh)
	}) // then
} // addWingGeometry







// MeshLines seems to run ok with 5000 lines. Regular Lines also run fine with 5000 lines. Stick with that for now. Maybe some sort of routine to sample the lines?
// Well, how many points do we want? How random should they be? Fir


function addShaderStreamlines(){
	
	var vertexShader = `
      precision mediump float;
      precision mediump int;
      
	  attribute float a_mach;
	  varying float v_mach;
	  
      void main()    {
		v_mach = a_mach;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;
    var fragmentShader = `
      precision mediump float;
      precision mediump int;
      
	  uniform float u_thresholds[255];
	  uniform sampler2D u_colorbar;
	  
	  varying float v_mach;
	  
	  
	  vec4 sampleColorBar(sampler2D colorbar, float f, float a, float b)
	  {
		// The (f-a)/(b-a) term controls how colors are mapped to values.
		return texture2D( colorbar, vec2( 0.5, (f-a)/(b-a) ) );
	  }
	  
	  
      void main()    
	  {
		  
		// Value mapping limits stored at the end of thresholds.
		float min_mach = u_thresholds[253];
		float max_mach = u_thresholds[254];
		  
        gl_FragColor = sampleColorBar( u_colorbar, v_mach, min_mach, max_mach );;
      }
    `;
	
	
	// STREAMLINES
	streamlinegeometry = new THREE.BufferGeometry();
	streamlinematerial = new THREE.ShaderMaterial({
	  uniforms: colorbar.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });
	// transparent: true,
    // depthTest: false,
	// blending: THREE.AdditiveBlending,
	
	
	
	// streamlinematerial = new THREE.LineBasicMaterial( { color: 0xff0000, dashSize: 3, gapSize: 1 } );
	
	streamlineLoadPromise = fetch("./assets/deltawing/streamlines/streamlines_suction_side_min.csv")
	  .then(res=>res.text())
	  .then(t=>csvStreamline2jsonStreamline( text2csv(t) ));
	
	streamlineLoadPromise.then(sa=>{
		  sa.forEach((s,i)=>{
			  // Interpolate using THREE.CatmullRomCurve3 to create more points?
			  
			// Limited to 5000 lines for performance.
			if(i<2000){
			  // addControlLine(s);
			  addShaderLine(s);
			} // if
		  }) // forEach
		  
		  // console.log(lineShaderStreamlines)
	  }) // then
	
	console.log(addRandomShaderLine)
	console.log(toggleStreamlines)
} // addShaderStreamlines

function addShaderLine(points){
	
	// Convert the array of json objects into values for the float array.
	let times = [];
	let vals = [];
	let mach = [];
	points.forEach((p,i)=>{
		// Collect the points
		vals.push(p["Points:0"], p["Points:1"], p["Points:2"]);
		mach.push(p["Mach"])
		
		// Populate the time.
		times.push( p["IntegrationTime"] );
	}) // forEach
	
	
	
	let positions = new Float32Array(vals);
    let a_mach = new Float32Array(mach);

	let geometry = streamlinegeometry.clone();   
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("a_mach", new THREE.BufferAttribute(a_mach, 1));
    // geometry.setDrawRange(0, 0);



    let line = new THREE.Line(geometry, streamlinematerial.clone());
	line.tOffset = Math.random()*CycleDuration;
	line.times = times.reverse(); // reverse so checking for last element under time.
  
    lineShaderStreamlines.push(line);
    sceneWebGL.add(line)
} // addShaderLine

function updateShaderLine(t){
	// Fadeout was achieved by changing hte color on-the-go....
	// That was a lot of work being done all the time - constant traversal of the data, constant communication with the GPU...
	let L = 5;
	
	lineShaderStreamlines.forEach(line=>{
		// Even if I have the streamlines precomputed I still only move based on hte index position in hte array - still cannot simulate the actual velocity... Ok, but does it just advance to the point while keeping hte ones in hte back?
		
		// Don't increment every redraw, but instead find the index to the correct timestep. That should be the last timestep behind - always lagging a bit?
		// Even if the streamlines are recalculated to fit with the desired dt, the update still has to happen based on global time to avoid controls redrawing too fast.
		
		// This is the lagging cycling. For preceding cycling hte times reversal in line initialisation needs to be removed.
		
		// What to do when the reverse index isn't found? Then 0 should be output. Furthermore, stagger the indices by the random offset. But this offset should be in time!!
		
		let tOffset = (t + line.tOffset)%1*(IntegrationSpan[1]-IntegrationSpan[0]) + IntegrationSpan[0];
		
		// Age will always be > 0. t e[0,1], tOffset e[0,1]
		let revi = line.times.findIndex(function(v){return v <= tOffset});
		
	    
		/*
		Model it as the end of the line moving and dragging the lines behind itself?
		
		Either way you pay at one end. Or maybe 
		
		if 0 is the first index and 100 is the last index: 
		start = [0,0,0,0,0,0,1,2,3,4,5,...,95,96,97,98,99,100]
		count = [0,1,2,3,4,5,5,5,5,5,5,..., 5, 4, 3, 2, 1, 0]
		
		*/
		
		// It's forward drawing: start at i and draw n vertices;
		// Fade in: until age >= L, i=0, and n=age
		// Fade out: if age > maxAge, 
		
		// Implement the fadeout and fade in. fadeout is easy - just let the index go past the maximum. For fadeIn the 
		
		
		revi = revi < 0 ? 0 : line.times.length-1-revi;
		let start = Math.max(0, revi - 5);
		let count = revi-L < 0 ? start : (revi+5>line.times.length ? line.times.length-revi : 5 );
		
				
		line.geometry.setDrawRange( start, count)
		
		
	})
} // updateShaderLine


function addControlLine(points){
	// This is a line to show hte extent of the data.
	
	let positions = points.map(p=>{
		return new THREE.Vector3( p["Points:0"], p["Points:1"], p["Points:2"]+0.1)
	}); // reduce
	
	let geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( positions );
	
	let material = new THREE.LineBasicMaterial( { color: 0xff00ff } );
	
	let line = new THREE.Line( geometry, material);
	
	scene.add(line)
} // addControlLine



function addRandomShaderLine(){
	streamlineLoadPromise.then(sa=>{
		const i = 1159; // Math.floor( Math.random()*(sa.length-1) );
		const points = sa[i];
		
		let vals = [];
		points.forEach((p,i)=>{
			// Collect the points
			vals.push(p["Points:0"], p["Points:1"], p["Points:2"]);
		}) // forEach
		
		
		let positions = new Float32Array(vals);
		let geometry = streamlinegeometry.clone();   
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		
		
		
		var	material = new THREE.LineBasicMaterial( { color: 0xff00ff, vertexColors: true } );
		
		
		
		let line = new THREE.Line(geometry, material);
		sceneWebGL.add(line)
		console.log(`Line: ${ i }`, line)
	})
} // addRandomShaderLine


function toggleStreamlines(){
	streamlineOn = streamlineOn ? false : true;
	if(streamlineOn){
		lineShaderStreamlines.forEach(line=>{
			sceneWebGL.add(line)
		})
	} else {
		lineShaderStreamlines.forEach(line=>{
			sceneWebGL.remove(line)
		})
	}
} // toggleStreamlines



// Make the colormap.




// GUI
function setupHUD(){
	
	let template = `
	<div style="position: fixed;">
	  <div class="stats"></div>
	  <div class="controls" style="position: fixed; top: 10px; float: right; right: 10px;"></div>
	</div>
	`;
	
	const container = html2element(template);
	document.body.appendChild( container );
	
	// Add the Stats object.
	stats = new Stats();
	stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
	container.querySelector("div.stats").appendChild( stats.dom );
	
	// The decal GUI is appended into a separate container, as it is a modal. But the controls need to have a button that toggles the modal on/off.
	
	
	// MAYBE THIS GUI SHOULD BE WRAPPED UP?
	const gui = new GUI({
		container: container.querySelector("div.controls"),
		title: "Session controls"
	});
	elementsGUI = gui.addFolder("Elements");
	const addElementGUI = gui.addFolder("Add element");
	var allTransformControllers = [];

	// The button should open a modal, or append a selection to the GUI to configure the element to be added.
	const addElementConfig = {
		type: '',
		name: 'type in asset address',
		add: function(el){
			// Evaluate the current config and clear it.
			
			switch( addElementConfig.type ){
				case "Image":
					// addStaticImage( './assets/schlieren_mon_15p_0s_flat_side_flipped.jpg', 1, 0.4, 100, 0, Math.PI/2, 0, 0);
					break;
				case "Video":
					// addYoutubeVideo( 'JWOH6wC0uTU', 1, 0.8, 100, 0, 0, Math.PI/2, Math.PI/2 );
					break;
				case "Geometry":
					// addWingGeometry();
					break;
				case "Decal":
					addDecal();
				default:
			}; // switch
		}
	}


	addElementGUI.add( addElementConfig, "type", ['','Image','Video','Geometry','Decal'] ) // dropdown
	addElementGUI.add( addElementConfig, "name" ); 	// text field
	addElementGUI.add( addElementConfig, "add" ); 	// button
	
	
} // setupHUD




// CONTROLS
function addArcballControls(){
	
	arcballcontrols = new ArcballControls( camera, document.getElementById( 'css' ), sceneWebGL );
	arcballcontrols.focus( focusInitialPoint, 1, 1 );
	arcballcontrols.activateGizmos(false);
	
	// Adding hte controls, and changing the focus will both change the position of hte camera. When manually repositioning the camera, the controls need to be updated.
	camera.position.set( cameraInitialPoint.x, cameraInitialPoint.y, cameraInitialPoint.z );
	arcballcontrols.update();

} // addArcballControls



function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize( window.innerWidth, window.innerHeight );
} // onWindowResize


function animate() {
	requestAnimationFrame( animate );
	stats.update();
	render();
} // animate

function render() {	
	// Shader line should update at 60fps at most.
	let t = CurrentIntegrationTime();
	updateShaderLine(t)

	rendererWebGL.render( sceneWebGL, camera );
} // render




