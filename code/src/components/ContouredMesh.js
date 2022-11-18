/* CONTOUREDMESH
A threejs based component that allows the user to interactively switch between two basic rendering options (smooth/contoured), and switch on/off isolines and the data grid.

Contouring and isolines were the main challenge.

The first approach to contouring was to specify the appropriate colours for each of the vertices. However, the colours are still interpolated within the triangles, which can lead to smearing in certain areas.

The alternate approach is to determine the color of the pixel in the fragment shader. A simple texture lookup will still result in a smooth appearance. To achieve teh thresholding effect the thresholds need to be specified. A custom material is required to achieve this, but it also allows custom thresholds (as opposed to implicitly specified through a function) to be specified.


OBSERVATIONS
Due to linear interpolation the isoline can only pass through the triangle in a straight line. In cases where the isoline should change significantly on th scale of triangles this can result in some jagged features.


NOTES ON CONTOURING:
The contour thresholds indicate the values that should be drawn, but don't determine the actual colors used. The actual colour is determined by the mapping of the mach number to the texture lookup index.

However, these values required for the mapping (min,max mach values) can also be specified as a part of the thresholds, as the first and the last threshold. Furthermore, the thresholds should be governed by the colorbar, which will then also allow the user to adjust them.


BASICS:
GPU rendering using GLSL is performed in two steps: (1) vertex shader, (2) fragment shader. The vertex shader is evaluated for each triangle vertex, while the fragment shader is evaluated for every triangle pixel.

The vertex shader is the one that takes in the data specified by the user, and sets up the variables required for the fragment shader.

attributes -> data specified by the user. Only accessible in vertex shader.
varying    -> interface between vertex and fragment shaders
uniform    -> user specified variables that are the same for all vertices.

'varying' variables in the fragment shader are interpolations between the nearest vertices. Therefore a varying variable can be used to compare to a threshold, and retrieve the correct color. For this, a texture lookup table must be used.

In THREE.ShaderMaterial the uniforms projectionMatrix and modelViewMatrix are passed in automatically.

Using colors attached to vertices gives some striations, but using a texture does not!!
*/





import * as THREE from "three";
import { trimStringToLength } from "../helpers.js";






const vertexShader = `
	attribute vec4 a_color;
	attribute float a_mach;
	
	varying vec4 v_color;
	varying float v_mach;

	void main() 
	{
		v_color = a_color;
		v_mach = a_mach;
		
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	}
`; // vertexShader

const fragmentShader = `
	varying float v_mach;
	
	uniform float u_thresholds[255];
	uniform int u_n_thresholds;
	
	uniform bool u_isolines_flag;
	uniform bool u_contours_flag;
	
	uniform sampler2D u_colorbar;
	
	
	
	vec2 nearestThresholds( float f, float t[255], int n ){
		// Return the nearest smaller and nearest larger threshold.
		//
		float a = t[0];
		float b = t[n-1];
		for(int i=1; i<n; i++){
			// Mix combined with step allows a switch between two values.
			
			// if f > t[i] && (f - t[i] < f - a) then a = t[i] otherwise a
			// step( t[i], f ) -> true if t[i] < f - t[i] valid lower threshold.
			// step(f-t[i], f-a)) -> true if (f-t[i]) < (f-a) - t closer than a.
			
			a = mix(a, t[i], step( t[i],f    )*step( f-t[i], f-a) );
			b = mix(b, t[i], step( f   ,t[i] )*step( t[i]-f, b-f) );
		}; // for
		
		return vec2(a,b);
	}
	
	float distanceToIsoline( float f, float t ){
		// Distance in terms of value of f to the threshold t isoline, divided by the direction of the highest gradient. This is then just a local approach.
		return abs( (f - t)/fwidth(f) );
	}
	
	
	float unit(float f, float a, float b)
	{
		// Return value rescaled to the unit range given the value min and max.
		return (f-a)/(b-a);
	}
	
	
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
		
		vec4 aColor = vec4(1.0,1.0,1.0,1.0);
		vec4 isoColor = vec4(1.0,1.0,1.0,1.0);
		float mixRatio = 0.0;
		
		aColor = sampleColorBar( u_colorbar, v_mach, min_mach,max_mach );
		if( u_isolines_flag || u_n_thresholds > 0 ){		
		
			// Determine the thresholds this pixel is between.
			vec2 bounds = nearestThresholds( v_mach, u_thresholds, u_n_thresholds );
			
			// Only need to find the lower bound.
			if( u_contours_flag ){
				aColor = sampleColorBar( u_colorbar, bounds[0], min_mach,max_mach );
			}
			
			// Add the isoline. A flag is required to allow isolines to be added over smooth rendering, when n isolines = 0;
			if( u_isolines_flag ){
				float distIso = distanceToIsoline(v_mach, bounds[1]);
				mixRatio = 1.0 - smoothstep( 2.0*0.2, 2.0*0.6, distIso);
			}
		
		}
		
		gl_FragColor = mix( aColor, isoColor, mixRatio);
	}
`; // fragmentShader



/* Uniforms controlled by the colorbar GUI:
obj.uniforms = {
	u_colorbar: { type: "t", value: new CanvasTexture( canvas ) },
	u_thresholds: {value: initialThresholds },
	u_n_thresholds: {value: obj.n },
	u_isolines_flag: {value: false },
	u_contours_flag: {value: true }
};
*/



export default class ContouredMesh{
	constructor(configFilename, uniforms){
		let obj = this;
		
		
		obj.config = {
			source: configFilename,
			visible: true,
			remove: function(){}
		}
		
		
		
		obj.configPromise = fetch(configFilename)
		  .then(res=>res.json())
		
		
		
		/*
		The data promises should each return an array containing only hte relevant data. 
		dataPromise.then(a=>{
			a[0] = vertices
			a[1] = indices
			a[2] = values
		})
		
		
		Uniforms are expected (by the shaders), to have the following form.
		
		const uniforms = {
			u_colorbar: { type: "t", value: new THREE.CanvasTexture( colorbar.canvas ) },
			u_thresholds: {value: initialThresholds },
			u_n_thresholds: {value: n },
			u_isolines_flag: {value: false },
		};
		*/
		
		obj.dataPromise = obj.configPromise.then(json=>{
			
			// Load the pressure surface. Encoding prescribed in Matlab. Float64 didn't render.
			let verticesPromise = fetch( json.vertices )
			  .then(res=>res.arrayBuffer())
			  .then(ab=>{return new Float32Array(ab)}); // float32
			let indicesPromise = fetch( json.indices )
			  .then(res=>res.arrayBuffer())
			  .then(ab=>{return new Uint32Array(ab)}); // uint32
			let valuePromise = fetch( json.values )
			  .then(res=>res.arrayBuffer())
			  .then(ab=>{return new Float32Array(ab)}); // float32
		
			return Promise.all([verticesPromise, indicesPromise, valuePromise]).then(a=>{
		
		
				const distinctContouringMaterial = new THREE.ShaderMaterial( {
					uniforms: uniforms,
					vertexShader: vertexShader,
					fragmentShader: fragmentShader,
					side: THREE.DoubleSide
				}   ); // distinctContouringMaterial
				
				
				// Create teh geometry basics.
				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute( 'position', new THREE.BufferAttribute( a[0], 3 ) );
				geometry.setIndex( new THREE.BufferAttribute(a[1], 1) );
				geometry.computeVertexNormals();
				
				
				// Add flow attributes.
				geometry.setAttribute( 'a_mach', new THREE.BufferAttribute( a[2], 1 ) );
				
				
				
				const mesh = new THREE.Mesh( geometry, distinctContouringMaterial );
				mesh.name = json.name ? json.name : "Colour contours";
				
				
				
				// Add a wireframe on top.
				//var geo = new THREE.WireframeGeometry( mesh.geometry ); // or WireframeGeometry
				//var mat = new THREE.LineBasicMaterial( { color: 0xffffff } );
				//var wireframe = new THREE.LineSegments( geo, mat );
				//mesh.add( wireframe );
				
				
				return mesh;
			}) // Promise.all
		
		}) // then
		
		
		
	} // constructor
	
	
	addTo( sceneWebGL ){
		let obj = this;
		
		obj.dataPromise.then(mesh=>{
			sceneWebGL.add(mesh)
		}) // then
		
		obj.config.remove = function(){
			obj.gui.destroy();
			obj.dataPromise.then(mesh=>{
				sceneWebGL.remove(mesh)
			}) // then
		} // remove
				
	} // addTo
	
	
	addGUI(elementsGUI){
		let obj = this;
		
		
		// Add GUI controllers.
		const folder = elementsGUI.addFolder( "Geometry: " + trimStringToLength(obj.config.source, 27));
		
		folder.add( obj.config, "visible" ).onChange(function(v){ obj.dataPromise.then(mesh=>{mesh.visible = v}) }); 	   // boolean
		folder.add( obj.config, "remove" );      // button
		
	} // addGUI
	

} // ContouredMesh