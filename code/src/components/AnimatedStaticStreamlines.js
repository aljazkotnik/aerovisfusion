import * as THREE from "three";
import { trimStringToLength } from "../helpers.js";

const vertexShader = `
	  precision mediump float;
	  precision mediump int;
	  
	  attribute float a_mach;
	  varying float v_mach;
	  
	  void main()    {
		v_mach = a_mach;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	  }
	`;


const fragmentShader = `
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




/*
Data should be split up between streamlines and values.
Maybe streamlines should also be split up to allow dynamic loading?
Make sure the streamlines don't block the geometry build up animation.
*/




export default class AnimatedStaticStreamlines{
	on = true
	animated = true
	lines = []
	
	
	// Create a cyclic IntegrationTime clock - not cyclic before time should be linear;
	// So instead there should be a remainder that gets transformed.
	t0 = performance.now();
	CurrentShowTime = 0
	IntegrationSpan = [-0.009302791000000, 0.014919188];
	CycleDuration = 20*1e3; // [ms];
	
	
	
	constructor(source, uniforms){
		let obj = this;
		
		obj.config = {
			source: source,
			visible: true,
			type: ""
		}

		
		// STREAMLINES - keep for further copies.
		obj.streamlinegeometry = new THREE.BufferGeometry();
		obj.streamlinematerial = new THREE.ShaderMaterial({
		  uniforms: uniforms,
		  vertexShader: vertexShader,
		  fragmentShader: fragmentShader
		});
		// transparent: true,
		// depthTest: false,
		// blending: THREE.AdditiveBlending,

		obj.linesGroup = new THREE.Group();

		obj.streamlineLoadPromise = fetch( source )
		  .then(res=>res.json())


		obj.dataPromise = obj.streamlineLoadPromise.then(sa=>{
			sa.forEach((s,i)=>{
				// Interpolate using THREE.CatmullRomCurve3 to create more points?
				  
				// Limited to 5000 lines for performance.
				if(i<2000){
				  obj.addLine(s);
				} // if
			}) // forEach
			  
			return obj.lines
		  }) // then

		
		
	} // constructor
	
	
	// CORE FUNCTIONALITY
	
	update(){
		let obj = this;
		
		// Calculate the current integration time
		if(obj.animated){
			const t = ((performance.now() - obj.t0) % obj.CycleDuration)/obj.CycleDuration
			obj.show(t);
		}
		
	} // update
	
	
	addLine(streamlineJson){
		let obj = this;
		
		let positions = new Float32Array( streamlineJson.Points );
		let a_mach = new Float32Array( streamlineJson.Values );

		let geometry = obj.streamlinegeometry.clone();   
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("a_mach", new THREE.BufferAttribute(a_mach, 1));
		// geometry.setDrawRange(0, 0);


		let line = new THREE.Line(geometry, obj.streamlinematerial.clone());
		line.tOffset = Math.random()*obj.CycleDuration;
		line.times = streamlineJson.IntegrationTime.reverse(); // reverse so checking for last element under time.
	  
		obj.lines.push(line);
		obj.linesGroup.add(line);
	} // addLine
	
	
	show(t){
		let obj = this;
		// Fadeout was achieved by changing hte color on-the-go....
		// That was a lot of work being done all the time - constant traversal of the data, constant communication with the GPU...
		let L = 5;
		obj.CurrentShowTime = t;
		
		obj.lines.forEach(line=>{
			// Even if I have the streamlines precomputed I still only move based on hte index position in hte array - still cannot simulate the actual velocity... Ok, but does it just advance to the point while keeping hte ones in hte back?
			
			// Don't increment every redraw, but instead find the index to the correct timestep. That should be the last timestep behind - always lagging a bit?
			// Even if the streamlines are recalculated to fit with the desired dt, the update still has to happen based on global time to avoid controls redrawing too fast.
			
			// This is the lagging cycling. For preceding cycling hte times reversal in line initialisation needs to be removed.
			
			// What to do when the reverse index isn't found? Then 0 should be output. Furthermore, stagger the indices by the random offset. But this offset should be in time!!
			
			// Multiply with animated to allow for synchronised view.
			let tShow = (t + obj.animated*line.tOffset)%1*(obj.IntegrationSpan[1]-obj.IntegrationSpan[0]) + obj.IntegrationSpan[0];
			
			// Age will always be > 0. t e[0,1], tOffset e[0,1]
			let revi = line.times.findIndex(function(v){return v <= tShow});
			
			
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
			
			
		}) // forEach
		
	} // show
	
	
	showstatic(){
		let obj = this;
		obj.animated = false;
		obj.lines.forEach(line=>{
			line.geometry.setDrawRange(0, line.times.length-1)
		})
	} // showstatic
	
	
	showanimated(){
		let obj = this;
		obj.animated = true;
	} // showanimated
	
	
	showsynchronised(){
		let obj = this;
		obj.animated = false;
		obj.show(obj.CurrentShowTime)
	} // showsynchronised
	
	
	
	
	
	
	addTo(sceneWebGL){
		let obj = this;
		sceneWebGL.add(obj.linesGroup)		
	} // addTo
	
	
	
	addGUI(elementsGUI){
		let obj = this;
		// lil-gui doesn't allow a new gui to be attached to an existing gui, so instead the container is passed in, and the gui created here, for brevity of code in the main script.
		
		/*
		Make a GUI menu for the streamlines.

		What should be configurable?
		- Integration span
		- CycleDuration
		- Type of visualisation: static, free animation, synchronised animation
		- Flow variable
		*/

		obj.gui = elementsGUI.addFolder("Streamlines: " + trimStringToLength(obj.config.source, 22));


		obj.gui.add( obj.config, "visible" ).onChange(function(v){ 
			obj.linesGroup.visible = v;
		}); 	   // boolean


		const typeConfig = {
			static: function(){ obj.showstatic() },
			flowing: function(){ obj.showanimated() } // ,
			// synchronised: function(){ obj.showsynchronised() }
		}
		
		const type = obj.gui.add( obj.config, "type", [""].concat(Object.keys(typeConfig)) ) // dropdown
		type.onChange(value=>{
			if(typeConfig[value]){
				let f = typeConfig[value];
				f();
			} // if
		}) // onChange
		
	} // addGUI
	
	
	
	
} // AnimatedStaticStreamlines