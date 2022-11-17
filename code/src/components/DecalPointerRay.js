import PointerRay from "./PointerRay.js";

export default class DecalPointerRay extends PointerRay{
	
	selected = undefined
	decals = []
	
	constructor(camera, geometries){
		super(camera, geometries)
		let obj = this;
		
		// To select either a geometry to place a decal on, or a decal itself, the arrays of options need to be defined.
		obj.pointerdown = function(event){
			// How do we deselect a decal? Another longpress, or when another decal is selected.
			let decalMeshes = obj.decals.map(d=>d.mesh);
			let target = obj.checkIntersection( event.clientX, event.clientY, decalMeshes );
			let targetDecal = obj.decals[decalMeshes.indexOf(target.object)];
			
			if ( target ){
				obj.decals.forEach(decal=>{
					decal.unhighlight();
				}) // forEach
				
				// If target object is the current selected decal, then it should be turned off.
				let active = obj.selected ? obj.selected.mesh != target.object : true;
				targetDecal.highlight(active);
				obj.selected = active ? targetDecal : undefined;
			}; // if
		} // pointerdown
		
		obj.pointerup = function(event){
			let target = obj.checkIntersection( event.clientX, event.clientY, obj.geometries );
			if ( target ){
				obj.positionInteraction( target );
			}; // if
		} // pointerup
		
	} // constructor
	
	
	positionInteraction(target){
		// Dummy function
	} // positionInteraction
	
} // DecalPointerRay