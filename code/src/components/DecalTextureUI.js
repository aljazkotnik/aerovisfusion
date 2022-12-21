import * as THREE from "three";

/* What else needs to be done?
- Add a lil gui to the decal manager.
- Toggle the decal gui to adjust the texture
- Restrict the texture to the size of hte image
- Once the submit button is hit, the calculated texture should appear.

- functionality to remove geometries and points. Maybe longclick?
*/


// GUI builder
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { html2element } from "../helpers.js";


const template = `<div style="display: none;">
<canvas class="editor"></canvas>
<div class="gui" style="position: absolute; top: 10px; right: 10px; text-align: right;"></div>
</div>`


export default class DecalTextureUI{
	
	constructor(source){
		let obj = this;
		
		// Make a node to which everything is appended.
		obj.node = html2element(template);
		
		
		/*
		Should I have 3 canvases? A high-resolution canvas for the actual decal, a lower resolution canvas for the editor, and a small resolution canvas for the trackpad?
		*/
		
		
		// Create the canvas to draw and edit the texture on.
		let canvas = obj.node.querySelector("canvas");
		obj.ctx = canvas.getContext('2d');
		obj.ctx.canvas.width = window.innerWidth;
		obj.ctx.canvas.height = window.innerHeight;
		
		
		
		// create an additional alphamap texture.
		let texturecanvas = document.createElement("canvas");
		texturecanvas.width = 2048; // window.innerWidth;
		texturecanvas.height = 2048; // window.innerHeight;
		obj.texture = new THREE.CanvasTexture(texturecanvas);
		obj.texturectx = texturecanvas.getContext("2d");
	
		
		
		// Draw the raw image onto the editor canvas.
		obj.rawImage = new ImageTexture(source);

		
		// Configure the editor
		obj.maskUI = new MaskEditor(obj.ctx);
		
		
		
		// Allow for complete redraw.
		obj.maskUI.onpointermove = function(){
			obj.render();
		}
		
		
		
		// Trackpad to allow the user to adjust the texture. When should the changes be discarded?
		obj.trackpad = new TrackpadImage();
		obj.trackpad.onpointermove = function(){
			// Redraw the texture with the appropriate manual offset. Note that the offset from the trackpad needs to be scaled accordingly to the canvas size. Maybe the trackpad should give a non-dimensional offset out! And the drawing should scale it appropriately.
			let trackpadctx = obj.trackpad.ctx;
			let rect = obj.calculateMaskRect( trackpadctx );
			
			console.log( rect )
			
			obj.drawDecal( trackpadctx, rect );
			obj.updateTexture();
		}
		
		
		// Add in the GUI.
		const guiconfig = {
			preview: function(){
				let rect = obj.calculateImageRect( obj.ctx );
				obj.drawDecal( obj.ctx, rect );
			},
			adjust: function(){
				obj.render();
			},
			submit: function(){
				// When submitting hte preview needs to be drawn, and then the manager needs to be hidden. But the preview twice still doesn't work...
				
				// Would be good to somehow enlarge the clipped are to make the whole canvas area available. Enlarging should be easy, it's more about positioning the clip over the image correctly...
				
				// Would be good if the user could select the center of the decal...
				
				
				// Make the main texture
				obj.hide();
				obj.updateTexture();
				
				// Update the trackpad image here. The trackpad image will be static anyway.
				let trackpadctx = obj.trackpad.ctx;
				let rect = obj.calculateMaskRect( trackpadctx );
				obj.drawDecal( trackpadctx, rect );
				
				console.log(rect)
			}
		}; // guiconfig
		
		
		
		// Add a gui before the canvas
		const gui = new GUI({container: obj.node.querySelector("div.gui"), title: "Decal editor"});
		
		gui.add(guiconfig, "preview")
		gui.add(guiconfig, "adjust")
		gui.add(guiconfig, "submit")
		
		
		
	} // constructor
	
	
	
	drawDecal( ctx, rect ){
		// Draw the clipped image to the canvas used as the texture. The image should be drawn in the center of the canvas.
		let obj = this;
		
		// Clear everything
		ctx.reset();
		ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
		
		// Calculate the position and extent of the drawn image.
		if( obj.maskUI.maskDrawn() ){			
			/// draw the shape we want to use for clipping
			obj.maskUI.drawClip(ctx, rect);
			
			/// change composite mode to use that shape. Source-over is default
			ctx.globalCompositeOperation = 'source-in';
		} else {
			// If no mask was drawn the whole image should be drawn. This is calculated here.
			rect = obj.calculateImageRect(ctx);
		} // if
		/// draw the image to be clipped. But draw it offset, like the mask was offset to be in the middle of the screen.
		obj.rawImage.draw(ctx, rect);
		
	} // drawDecal
	
	
	
	updateTexture(){
		// Draw the edited decal image onto the texture canvas.
		let obj = this;
		let rect = obj.calculateMaskRect( obj.texturectx );
		obj.drawDecal( obj.texturectx, rect );
		obj.texture.needsUpdate = true;
	} // adjust
	
	
	
	
	render(){
		// Redraw the editor during editing. The image in hte background may need to be changed also.
		let obj = this;
		let ctx = obj.ctx;
		
		// Clear canvas.
		ctx.reset();
		ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
		
		// Calculate where the image should be drawn.
		let rect = obj.calculateImageRect( ctx );
		
		
		let dp = obj.rawImage.draw( ctx, rect );
		dp.then(function(){
			// The geometry can only be drawn to the interactive canvas.
			obj.maskUI.scale.rect = rect;
			obj.maskUI.drawGeometry();
		})
	} // render
	
	
	show(){
		let obj = this;
		
		obj.node.style.width = `${ window.innerWidth }px`;
		obj.node.style.height = `${ window.innerHeight }px`;
		
		obj.render();
		obj.node.style.display = "";
	} // show
	
	
	hide(){
		let obj = this;
		obj.node.style.display = "none";
	} // hide
	
	resize(w,h){
		// Resize the manager given the width and height of the window.
		
	}
	
	
	calculateMaskRect(ctx){
		// Calculate the rectangle into which the clipped image should be drawn. This depends on the mask size, and any manual adjustments.
		let obj = this;
		
		// Given canvas.
		let canvas = ctx.canvas;
		
		// Mask - this could be infinite size if the mask has not yet been drawn. At the same time the editor can't know the default size.
		
		let mask = obj.maskUI.maskDrawn() ? obj.maskUI.maskRectangle() : obj.calculateImageRect( ctx );
		
		// Manual adjustment.Needs to be scaled to take into account the new canvas size.
		let adjustment = obj.trackpad.offset();
		let scale = Math.max(mask.width, mask.height)/256;
		adjustment = adjustment.map(v=>v*scale)
		
		// Calculate aspect ratio, which is original px per canvas px.
		let ar = Math.min( canvas.width/mask.width, canvas.height/mask.height );
				
		// Return the rectangle that can be used for positioning hte image on hte canvas straight away.
	    return {
			x: (canvas.width - ar*mask.width)/2 + adjustment[0],
			y: (canvas.height - ar*mask.height)/2 + adjustment[1],
			width: ar*mask.width,
			height: ar*mask.height
	    } 
		
		
	} // calculateMaskRect
	
	
	calculateImageRect(ctx){
	    // Calculate the rectangle within which the editor will draw the image, and the corresponding geometry. For the editor all the drawing should be done so that the original image is centered on the canvas.
	    let obj = this;
	    
	    let canvas = ctx.canvas;
	    let decal = obj.rawImage;
		
		// Calculate aspect ratio, which is original px per canvas px.
		let ar = Math.min( canvas.width/decal.width, canvas.height/decal.height );
				
		// Return the rectangle that can be used for positioning hte image on hte canvas straight away.
	    return {
			x: (canvas.width - ar*decal.width)/2,
			y: (canvas.height - ar*decal.height)/2,
			width: ar*decal.width,
			height: ar*decal.height
	    }  
			
	} // calculateDestinationRect
	
} // DecalTextureUI




class Scale{
	// This is the pixel rectangle to which the 0-1 unit values of coordinates is mapped.
	rect = {
		x: 0,
		y: 0,
		width: 1,
		height: 1
	}
	
	constructor(){
		let obj = this;
	} // constructor
	
	
	ppx2unit(p){
		// Convert a point from pixel to unit.
		let obj = this;
		return [
			(p[0]-obj.rect.x)/(obj.rect.width),
			(p[1]-obj.rect.y)/(obj.rect.height)
		]
	} // ppx2unit
	
	punit2px(p){
		// Convert a point from pixel to unit.
		let obj = this;
		
		return [
			p[0]*obj.rect.width + obj.rect.x,
			p[1]*obj.rect.height + obj.rect.y
		]
	} // ppx2unit
	

} // Scale


// The new approach is that the image and the mask are drawn to a given canvas. The only requirement is that the canvas is rectangular, because that is a texture requirement.

class ImageTexture{
	
	im = undefined
	width = 0
	height = 0
	
	constructor(sourcelink){
		let obj = this;
		
		obj.im = new Promise(function(resolve, reject){
			var im = new Image();
			im.src = sourcelink;
			im.onload = function() {
				obj.width = im.width;
				obj.height = im.height;
				resolve(im)
			};
		}) // new Promise
	} // constructor

	
	draw(ctx, rect){
		let obj = this;
		
		let defaultRect = {
			x: 0, 
			y: 0, 
			width: ctx.canvas.width, 
			height: ctx.canvas.height
		} // defaultRect
		rect = rect==undefined ? defaultRect: rect;
		
		return obj.im.then(im=>{
			
			// Image size.
			let sw = im.width;
			let sh = im.height;
			
			// If the canvas is resized here, then everything before this point is thrown away!!
			ctx.drawImage(im, 0, 0, sw, sh, rect.x, rect.y, rect.width, rect.height);
		}) // new Pomise
	} // draw
	
} // ImageTexture


class MaskEditor{
	
	// DONE: Points should be stored in non-dimensional image units
	// Control the drawing of lines first, and only fill when the object is closed.
	// Individual vertices should be adjustable.
	// Allow several geometries to be selected.
	geometries = [[]]
	closed = false;
	
	// Move correction is in image coordinates, but can be prescribed in pixels.
	movecorrection = [0,0]
	selectedgeometries = []
	
	constructor(ctx){
		let obj = this;
		obj.ctx = ctx;
		
		
		// The canvas chould differentiate between click to add a point, and pointerdown and drag to move existing point around.
		
		//
		//ctx.canvas.addEventListener("click", function(event){
		//	console.log( obj.retrieveGeometry(event) );
		//	obj.addPoint(event);
		//})
		
		
		// Ok, on pointerdown I need to find any relevant geometry. Then, on pointerup I need to decide whether to add point, or not. Then I need a way to delete a point also.
			// Configure the interactive adjustment.
		// adjustedGeometry are the points that have been mapped to pixels. Internally the values are kept in image coordinates. Therefore thos values are not changed when adjusting this here.
		let pointerDown = undefined;
		let moved = false;
		
		ctx.canvas.addEventListener("pointerdown", function(event){
			// Register the relevant geometry, and the initial clicked point. But how will the redrawing work? For that I need the original image.
			event.stopPropagation()
			pointerDown = event;
			moved = false;
			obj.applyGeometrySelection(event);
		})
		
		ctx.canvas.addEventListener("pointermove", function(event){
            event.stopPropagation()
			if(pointerDown && distPx( obj.event2canvas(pointerDown) , obj.event2canvas(event) )>5**2){
				moved = true;
				
				let p0 = obj.scale.ppx2unit( obj.event2canvas(pointerDown) )
				let p1 = obj.scale.ppx2unit( obj.event2canvas(event) );
				
				obj.movecorrection = [p1[0] - p0[0], p1[1] - p0[1]];
				
				obj.onpointermove();
			} // if
		}) // pointermove
		// At move end the correction has to be applied permanently
		ctx.canvas.addEventListener("pointerup", function(event){
			event.stopPropagation()
			if(!moved){
				obj.addPoint(event)
			}; // if
			obj.applyMoveCorrections();
			pointerDown = undefined;
			moved = false;
		}) // pointerup
		
		ctx.canvas.addEventListener("pointerout", function(event){
			event.stopPropagation()
			obj.applyMoveCorrections();
			pointerDown = undefined;
			moved = false;
		}) // pointerout
		
		
		
		// A scale to allow user added geoemtry to be converted into image unit coordinates and back.
		obj.scale = new Scale();
		obj.scaledest = new Scale();
		
	} // constructor
	
	
	
	// DATA INTERFACE
	addPoint(event){
		let obj = this;
		
		// The last element of the geometries array is the current array.
		let current = obj.geometries[obj.geometries.length-1];
		
		// The event position is in pixel.
		let px = obj.event2canvas(event);
					
		
		
		
		// If the point is close enough to existing points, then fill the area.
		obj.closed = current
		  .map( p=>obj.scale.punit2px(p) )
		  .some( p=>((p[0]-px[0])**2 + (p[1]-px[1])**2)<10**2);
		  
		// Furthermore, if the area is closed, then a new area drawing should begin with the next click.
		if(obj.closed){
			current.closed = true;
			obj.geometries.push( [] );
		} else {
			// Store values in non-dim units.
			let pu = obj.scale.ppx2unit(px);
			current.push( pu );
		} // if

		
		
		// Draw just the geometry, and the underlying image remains the same.
		obj.drawGeometry();
		
	} // addPoint
	
	
	/* What kind of interactions do I want to support?
	Click - addPoint
	Click near point and drag - movePoint
	click on poygon and drag - movePolygon
	
	*/
	// How am I going to adjust the data? I'm going to change its coordinates directly no?
	applyGeometrySelection(event){
		let obj = this;
		
		// First get the canvas pixel coordinates of the event.
		let clickpoint = obj.event2canvas(event);
		
		// Find the top most geometry that has the event in it. The loop should go from the last to the first geometry,
		// Return a series of points to which the drag interaction offset should be applied.
		let g = obj.geometries.map(g=>[false]);
		for(let i=obj.geometries.length-1; i>-1; i--){
			
			let points = obj.geometries[i].map(p=>obj.scale.punit2px(p));

			// Check if the current point is within the geometry. If it is don't check for other geometries.			
			if( isPointInside(points, clickpoint) ){
				
				// All the points at once are considered initially, and if any of hte points are close enough to the clicked point, then the selection is narrowed down to that point.
				g[i] = [true];
			} // if
			
			
			// Always want to find only the closest point, so even when finding candidates restict to the closest one.
			let candidates = points.filter(p=>distPx(clickpoint,p) < 10**2).forEach((p,j)=>{
				// g[i] now has an index saying whether the click was within the geometry or not. But what I want to know is whether a distance needs to be calculated or not. And at some point I will want to select several points at once.
				// Here I know that the point will definitely be selected instead of the whole geometry. Furthermore, I know that a single point should be selected.
				g[i][0] = true;
				
				let current = g[i][1] !=undefined ? points[ g[i][1] ] : p;
				let isCloser = distPx( clickpoint, p ) <= distPx( clickpoint, current );
				g[i][1] = isCloser ? points.indexOf(p) : g[i][1];
				
			}) // forEach
						

			// If some geometry was found on this layer, then stop the process.
			if(g[i]){
				continue;
			} // if
		} // for	
		
		obj.correctionflag = g;
		
	} // applyGeometrySelection
	
	getMoveCorrection(i,j){
		let obj = this;
		
		// First check if the geometry should be corrected, and secondly check if a point in hte geometry should be corrected. If the point is defined it should override the geometry flag.
		let isGeometry = obj.correctionflag[i][0];
		let isPoint = obj.correctionflag[i][1];
		let correctionNeeded = isPoint != undefined ? isPoint==j : isGeometry;
		
		return obj.movecorrection.map(p=>p*correctionNeeded);
		
	} // getMoveCorrection
	
	applyMoveCorrections(){
		// Apply corrections permanently.
		let obj = this;
		
		for(let i=0; i<obj.geometries.length; i++){
			obj.geometries[i].forEach((p,j)=>{
				let corr = obj.getMoveCorrection(i,j);
				p[0] += corr[0];
				p[1] += corr[1];
			})
		} // for	
		
		obj.movecorrection = [0,0];
		
	} // applyMoveCorrections
	
	onpointermove(){
		// dummy functionality
	};
	
	
	// DATA TRANSFORM PLACEHOLDERS
	event2canvas(event){
		// Get the canvas bounding box.
		let obj = this;
		let rect = obj.ctx.canvas.getBoundingClientRect();
		return [event.clientX - rect.x, event.clientY - rect.y]
	} // event2canvas
	
	
	// DRAWING
	
	drawGeometry(){
		// Used to draw the editing elements. Geometry is drawn only on the editor canvas the interactions were attached to, and not to the texture canvas. Therefore a ctx input is not needed.
		let obj = this;
		
		for(let i=0; i<obj.geometries.length; i++){
			let current = obj.geometries[i];
			let points = current.map((p,j)=>{
				let corr = obj.getMoveCorrection(i,j);
				let pc = [p[0]+corr[0], p[1]+corr[1]];
				return obj.scale.punit2px(pc)
			});
			
			// The drwing calls perform just the drawing - no additional transformation of coordinates is done.
			obj.drawLines(points, current.closed);
			obj.drawPoints(points);
		} // for		
		
	} // draw
	
	
	drawClip(ctx, rect){
		// The clip may need to be drawn either on hte editor canvas, or onto the texture canvas. Therefore a ctx input is required.
		let obj = this;
		
		obj.scaledest.rect = rect;
		
		
		// Draw the current clip
		ctx.fillStyle = '#FFFFFF';
		ctx.beginPath();
		
		let closedGeometries = obj.geometries.filter(geometry=>geometry.closed);
		
		closedGeometries.forEach(closedgeometry=>{
			let points = closedgeometry.map(p=>obj.scaledest.punit2px(p));
			
			ctx.moveTo( points[0][0], points[0][1] );
			for(let i=0; i<points.length;i++){
				ctx.lineTo( points[i][0], points[i][1] );
			} // for
			ctx.fill();	
		}) // forEach
		
		ctx.clip();
	} // drawClip
	
	drawLines(points, closed){
		let ctx = this.ctx;
		
		
		// Iterate through points, and draw them.
		if(points.length > 1){
			
			ctx.fillStyle = '#000000';
			ctx.lineWidth = 2;
			
			ctx.moveTo( points[0][0], points[0][1] );
			ctx.beginPath();
			
			for(let i=0; i<points.length;i++){
				ctx.lineTo( points[i][0], points[i][1] );
			} // for
			
			
			
			
			if(closed){
				ctx.closePath();
				ctx.fill();
			} // if
			
			ctx.stroke();
		}; // if
	} // drawLines
	
	drawPoints(points){
		// Draw points on top of the lines. Point circles not used in the mask itself.
		let obj = this;
		for(let i=0; i<points.length; i++){
			obj.drawNode( points[i] );
		} // for
		
	} // drawPoints
	
	drawNode(p){
		let obj = this;
		let ctx = obj.ctx;

		// ctx.arc(x,y,r,sAngle,eAngle,counterclockwise);		
		ctx.beginPath();
		ctx.fillStyle = '#000000';
		ctx.arc( p[0],p[1],5,0*Math.PI,2*Math.PI);
		ctx.fill();
		ctx.closePath();

		// ctx.arc(x,y,r,sAngle,eAngle,counterclockwise);		
		ctx.beginPath();
		ctx.fillStyle = '#FFFFFF';
		ctx.arc( p[0],p[1],3,0*Math.PI,2*Math.PI);
		ctx.fill();
		ctx.closePath();

		
	} // drawPoint
	
	
	maskDrawn(){
		let obj = this;
		let closedGeometries = obj.geometries
		  .filter(function(geometry){return geometry.closed})
		return closedGeometries.length > 0;
	} // maskDrawn
	
	maskRectangle(){
		let obj = this;
		
		// Loop over geometries and find min and max in pixels.
		let x = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
		let y = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
		obj.geometries
		  .filter(function(geometry){return geometry.closed})
		  .forEach(function(geometry){
			let points = geometry.map(p=>obj.scale.punit2px(p));
			points.forEach(function(point){
				x[0] = x[0] < point[0] ? x[0] : point[0];
				x[1] = x[1] > point[0] ? x[1] : point[0];
				
				y[0] = y[0] < point[1] ? y[0] : point[1];
				y[1] = y[1] > point[1] ? y[1] : point[1];				
			}) // forEach
		}) // forEach
		
		
		return {
			x: x[0],
			y: y[0],
			width: x[1]-x[0],
			height: y[1]-y[0]
		}
	} // maskRectangle
	

} // MaskEditor


class TrackpadImage{
	
	// A list of interactive adjustments made.
	adjusts = [[0,0]]
	
	// Ongoing adjustment.
	delta = [0,0]
	
	constructor(){
		let obj = this;
		
		// This is the node that is added to the GUI.
		obj.node = document.createElement("canvas");
		obj.ctx = obj.node.getContext('2d');
		
		obj.node.width = 256;
		obj.node.height = 256;
		
		
		// There should be a red dot on the canvas that can be dragged around to allow the user to adjust the center of the image.
		let initialPoint = undefined;
		obj.node.addEventListener("pointerdown", function(e){
			// Register the initial event.
			initialPoint = e;
			obj.delta = [0,0];
		}) // pointerdown
		
		obj.node.addEventListener("pointermove", function(e){
			// Update the image.
			if(initialPoint){
				obj.delta[0] = (e.clientX - initialPoint.clientX);
				obj.delta[1] = (e.clientY - initialPoint.clientY);
				
				obj.onpointermove();
			} // if
		}) // pointermove
		
		obj.node.addEventListener("pointerup", function(e){
			// Stop the editing.
			initialPoint = undefined;
			obj.adjusts.push(obj.delta);
			obj.delta = [0,0];
		}) // pointerup
		
		
	} // constructor
	
	
	offset(){
		// Return the total offset from all previous interactions, as well as the ongoing one.
		let obj = this;
		
		let previous = obj.adjusts.reduce(function(acc,item){
			return [acc[0]+item[0], acc[1]+item[1]]
		}) // reduce
		
		return [
		    obj.delta[0] + previous[0], 
			obj.delta[1] + previous[1]
		]
	} // offset
	
	
	
	onpointermove(){}
	
} // TrackpadImage




function distPx(p0, p1){
	// Calculate the pixel distance of 2 points.
	return (p0[0]-p1[0])**2 + (p0[1]-p1[1])**2;
} // distPx


function isPointInside(boundary, point){
	// Check wheteher the 'point' [pixel coordinates] is within the polygon defined by the points array 'boundary'.
	let obj = this;
	
	// Default answer is no.
	let isInside = false
	
	let n = boundary.length
	if(n>2){
		for(let i=1; i<n; i++){
			// Check whether this edge is being passed when moving from the point to the right. If it passes an even number of edges it's outside, otherwise it's inside.
			let p = passesEdge(boundary[i-1], boundary[i], point)
			isInside = p ? !isInside : isInside
		} // for
		
		// Need to check the same number of edge segments as vertex points. The last edge should be the last and the first point.
		let p = passesEdge(boundary[n-1], boundary[0], point)
		isInside = p ? !isInside : isInside
	} // if
	
	return isInside
} // isPointInside

// A ray casting method to check whether a point is within a polygon or not.
function passesEdge(p0, p1, point){
	// One point needs to be above, while the other needs to be below -> the above conditions must be different.
	
	if( (p0[1] > point[1]) !== (p1[1] > point[1]) ){
		// One is above, and the other below. Now find if the x are positioned so that the ray passes through. Essentially interpolate the x at the y of the point, and see if it is larger.
		let x = (p1[0] - p0[0])/(p1[1] - p0[1])*(point[1] - p0[1]) + p0[0]
		return x > point[0]
		
	} else {
		return false
	} // if
} // checkIntersect
