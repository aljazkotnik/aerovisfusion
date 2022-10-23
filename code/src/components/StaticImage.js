import * as THREE from "three";

export default class StaticImage{
	constructor(id, w, x, y, z, rx, ry, rz){
		let obj = this;
		
		obj.config = {
			name: "..."+id.slice(-27),
			visible: true,
			positioning: false,
			remove: function(){}
		}
		// The static image GUI only needs to select the appropriate file, and it needs to allow the image to be toggled off/on, and switch to this element being repositioned. It should also be named. It needs to be deletable!!
		
		// The initial position should be picked automatically. At some distance in front of the camera?
		
		
		// Add in the schlieren image as well. Use the loaded image width and height to size the plane hosting it.
		obj.created = new Promise(function(resolve,reject){
			
			const im = new THREE.TextureLoader().load( id, function(texture){
			
				const geometry = new THREE.PlaneGeometry( texture.image.width, texture.image.height );
				const material = new THREE.MeshBasicMaterial( { 
					map: texture,
					side: THREE.DoubleSide		
				} );
				const webGLImage = new THREE.Mesh( geometry, material );
				webGLImage.name = id;
				
				// Calculate the scaing required to bring the image to the desired size. Size it so that the width reaches the specified 'w' value.
				let k = w/texture.image.width;
				
				
				webGLImage.position.set( x, y, z );
				webGLImage.rotation.set( rx, ry, rz );
				webGLImage.scale.set( k, k, k );
				
				
				// To seet opacity:
				// webGLImage.material.transparent = true;
				// webGLImage.material.opacity = 0.7;
				
				resolve( webGLImage )
			}); // load
			
		}); // new Promise
		
		
	} // constructor
	
} // StaticImage