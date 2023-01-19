import * as THREE from "three";




// DEFINE THE ANNOTATION SPHERE AND APPEARANCE
const annotationSphereMaterial = new THREE.ShaderMaterial( 
{
	uniforms: 
	{ 
		"c":   { type: "f", value: 1.0 },
		"p":   { type: "f", value: 1.4 },
		glowColor: { type: "c", value: new THREE.Color(0xff00ff) },
		viewVector: { type: "v3", value: new THREE.Vector3(0,0,0) }
	},
	vertexShader:   `
		uniform vec3 viewVector;
		uniform float c;
		uniform float p;
		varying float intensity;
		void main() 
		{
			vec3 vNormal = normalize( normalMatrix * normal );
			vec3 vNormel = normalize( normalMatrix * viewVector );
			intensity = pow( c - dot(vNormal, vNormel), p );
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
		`,
	fragmentShader: `
		uniform vec3 glowColor;
		varying float intensity;
		void main() 
		{
			vec3 glow = glowColor * intensity;
			gl_FragColor = vec4( glow, 1.0 );
		}
		`,
	side: THREE.FrontSide,
	blending: THREE.AdditiveBlending,
	transparent: true
}   );

var annotationSphereGeom = new THREE.SphereGeometry(1, 32, 16);








export default class VolumeAnnotation{
	
	selected = [];
	hidden = [];
	
	constructor(camera){
		let obj = this;
		
		// The camera is required to adjust the glow correctly.
		obj.camera = camera;
		
		
		// Create a group here.
		obj.group = new THREE.Group();
		
	} // constructor
	
	
	
	add(sc){
		// Add a sphere based on a sphere configuration object sc.
		let obj = this;
		
		let annotationGlow = new THREE.Mesh( annotationSphereGeom.clone(), annotationSphereMaterial.clone() );
		
		
		// annotationGlow.position.set(x, y, z);
		// annotationGlow.scale.setScalar( s );
		annotationGlow.position.copy( sc.position );
		annotationGlow.rotation.setFromVector3( sc.rotation );
		annotationGlow.scale.copy( sc.scale );
		
		annotationGlow.name = "AnnotationSphere";
		
		obj.group.add( annotationGlow );
		return annotationGlow;
	} // add
	
	
	remove(as){
		// Remove annotation sphere s.
		let obj = this;
		let itemsToRemove = as.filter(s=>obj.group.children.includes(s));
		itemsToRemove.forEach(s=>{
			obj.group.remove(s)
		}) // forEach
	} // remove
	
	clear(){
		let obj = this;
		obj.group.children.forEach(c=>{
			obj.group.remove(c);
		}) // forEach
	} // clear
	
	
	
	hide(){
		let obj = this;
		obj.hidden = [...obj.group.children];
		obj.hidden.forEach(sphere=>{
			obj.group.remove(sphere);
		})
	} // hide
	
	show(){
		let obj = this;
		obj.hidden.forEach(sphere=>{
			obj.group.add(sphere)
		})
		obj.hidden = [];
	} // show
	
	
	
	select(active){
		// Color a particular array of spheres `active'.
		let obj = this;
		
		
		let inactive = obj.group.children.filter(c=>!active.includes(c));
		
		active.forEach(s=>{
			s.material.uniforms.glowColor.value.setRGB(1,0,1);
		}) // forEach
		
		inactive.forEach(s=>{
			s.material.uniforms.glowColor.value.setRGB(0,1,1);
		}) // forEach
		
		
		obj.selected = active;
	} // select
	
	
	
	get geometry(){
		// Return json tag object. 
		let obj = this;
		
		// Extend geometry to include position, scale, and rotation.
		let g = obj.group.children.map(c=>{
			return {
				position: {x: c.position.x, y: c.position.y, z: c.position.z},
				rotation: {x: c.rotation.x, y: c.rotation.y, z: c.rotation.z},
				scale: {x: c.scale.x, y: c.scale.y, z: c.scale.z}
			}
		})
		g.type = "3d";
		return g
		
		
		
		
		//return obj.group.children.map(c=>{
		//	return [c.position.x, c.position.y, c.position.z, c.scale.x]
		//})
	} // get tag
	
	
	update(){
		// Update the view vector uniform by the camera position 'p' to display the glow correctly.
		let obj = this;
		

		obj.group.children.forEach(sphere=>{
			let v = sphere.material.uniforms.viewVector.value;
			v = v.subVectors( obj.camera.position, sphere.position );
		})
		
		
	} // update
	
	
	ontransform(){
		let obj = this;
		let adjustedSphere = obj.selected[0];
		for(let i=1; i<obj.selected.length; i++){
			obj.selected[i].position.copy( adjustedSphere.position );
		} // for
	} // ontransform
	
	
} // VolumeAnnotation