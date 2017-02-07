(function() {
	let canvas = document.getElementById("my-canvas");
	let context = canvas.getContext("2d");
	let timePreviousFrame,
		maxFPS = 60,
		interval = 1000 / maxFPS;
	let needsRefresh = true;

	let screenCorners = [
		// border
		{x: 0, y: 0},
		{x: canvas.width, y: 0},
		{x: canvas.width, y: canvas.height},
		{x: 0, y: canvas.height}
	];

	let nodes = [
		// polygon 1
		{x: 10, y: 10},
		{x: 70, y: 10},
		{x: 70, y: 100},
		{x: 10, y: 100},

		// polygon 2
		{x: 130, y: 30},
		{x: 140, y: 40},
		{x: 120, y: 110},
		{x: 120, y: 80},
		{x: 90, y: 60}
	];

	nodes.push(screenCorners[0]);
	nodes.push(screenCorners[1]);
	nodes.push(screenCorners[2]);
	nodes.push(screenCorners[3]);

	let segments = [
		[nodes[0], nodes[1]],
		[nodes[1], nodes[2]],
		[nodes[2], nodes[3]],
		[nodes[3], nodes[0]],

		[nodes[4], nodes[5]],
		[nodes[5], nodes[6]],
		[nodes[6], nodes[7]],
		[nodes[7], nodes[8]],
		[nodes[8], nodes[4]],

		[nodes[9], nodes[10]],
		[nodes[10], nodes[11]],
		[nodes[11], nodes[12]],
		[nodes[12], nodes[9]]
	];

	let lights = [
		{x: 150, y: 150}
	];

	/**
	 * Draw a "bulb", just a disc
	 */
	function drawLight(light) {
		context.beginPath();
		context.arc(light.x, light.y, 5, 0, 2 * Math.PI, false);
		context.fill();
	}

	function generateLightRays() {
		let rays = [];

		for (let node of nodes) {
			if (getPointKey(node) == getPointKey(lights[0])) {
				continue;
			}
			node.angle = Math.atan2(
				node.y - lights[0].y,
				node.x - lights[0].x
			);
			let nodeSide1Angle = node.angle - 0.00001;
			let nodeSide2Angle = node.angle + 0.00001;
			let ray = [
				[
					lights[0],
					{angle: nodeSide1Angle, x: lights[0].x + Math.cos(nodeSide1Angle), y: lights[0].y + Math.sin(nodeSide1Angle)}
				],
				[lights[0], node],
				[
					lights[0],
					{angle: nodeSide2Angle, x: lights[0].x + Math.cos(nodeSide2Angle), y: lights[0].y + Math.sin(nodeSide2Angle)}
				]
			];
			rays.push(ray);
		}

		rays.sort(function (a, b) {
			return a[1][1].angle - b[1][1].angle;
		});

		return rays;
	}

	/**
	 * Get the intersection coordinates between a ray (semi line) and a segment
	 */
	function getRaySegmentIntersection(ray, segment) {
		let rayX, rayY, segmentX, segmentY, distXs, distYs, dotProduct;
		rayX = ray[1].x - ray[0].x;
		rayY = ray[1].y - ray[0].y;
		segmentX = segment[1].x - segment[0].x;
		segmentY = segment[1].y - segment[0].y;

		// parallel, ignore
		if (rayY / rayX == segmentY / segmentX) {
			return null;
		}

		let s, t;
		distXs = ray[0].x - segment[0].x;
		distYs = ray[0].y - segment[0].y;
		dotProduct = -segmentX * rayY + rayX * segmentY;
		s = (-rayY * distXs + rayX * distYs) / dotProduct;
		t = ( segmentX * distYs - segmentY * distXs) / dotProduct;

		if (s >= 0 && s <= 1 && t >= 0) {
			return {
				param: t,
				point: {
					x: ray[0].x + Math.round(t * rayX),
					y: ray[0].y + Math.round(t * rayY)
				}
			};
		}
		else {
			return null;
		}
	}

	/**
	 * Get a string identifier of a point (coordinates of the point
	 * concatenated)
	 */
	function getPointKey(point) {
		return point.x + '-' + point.y;
	}

	/**
	 * Generates the rays of lights and the area in shadow based on the position
	 * of the light and the segments.
	 */
	function generateShadows(lightRays) {
		let shadowEdge = [];
		let polygon = [];
		let lastNodeOnEdge = null;
		for (let ray of lightRays) {
			let shadowNodes = generateLightToNodeShadow(ray);
			for (let nodeIndex in shadowNodes) {
				if (nodeIndex == 1
					|| nodeIndex != 1
					&& (shadowNodes[nodeIndex].x != shadowNodes[1].x
						|| shadowNodes[nodeIndex].y != shadowNodes[1].y
					)
				) {
					node = shadowNodes[nodeIndex];
					let nodeOnEdge = isNodeOnScreenEdge(node);
					if (nodeOnEdge) {
						lastNodeOnEdge = node;
						if (polygon.length) {
							polygon.push(node);
							shadowEdge.push(polygon);
							polygon = [];
						}
					}
					else {
						if (lastNodeOnEdge) {
							polygon.push(lastNodeOnEdge);
							lastNodeOnEdge = null;
						}
						polygon.push(node);
					}
				}
			}
		}

		if (polygon.length) {
			shadowEdge[0] = polygon.concat(shadowEdge[0] || []);
		}

		return shadowEdge;
	}

	function isNodeOnScreenEdge(node) {
		for (let cornerIndex = 0; cornerIndex < screenCorners.length; ++cornerIndex) {
			let edge = [
				screenCorners[cornerIndex],
				screenCorners[(cornerIndex + 1) % screenCorners.length]
			];
			let sideOfEdge = getPointSideFromLine(edge, node);
			if (sideOfEdge == 0) {
				return edge;
			}
		}

		return false;
	}

	function generateLightToNodeShadow(lightRays) {
		let lightPoints = [];
		for (let lightRay of lightRays) {
			let closestSegment = null;
			// find which is the closest segment the ray is touching
			for (let segment of segments) {
				let intersectionPoint = getRaySegmentIntersection(
					lightRay,
					segment
				);

				if (!intersectionPoint) {
					continue;
				}

				if (!closestSegment || closestSegment.param > intersectionPoint.param) {
					closestSegment = intersectionPoint;
				}
			}

			closestSegment.point.angle = lightRay[1].angle;
			lightPoints.push(closestSegment.point);
		}

		return lightPoints;
	}

	/**
	 * Returns -1 of the point is on a side of the line, 0 if they are aligned
	 * or 1 if the point is on the other side.
	 */
	function getPointSideFromLine(line, point) {
		let lineDeltaX = line[1].x - line[0].x;
		let lineDeltaY = line[1].y - line[0].y;
		let side = lineDeltaX * (point.y - line[0].y) - lineDeltaY * (point.x - line[0].x);
		return side && side / Math.abs(side);
	}

	/**
	 * Method to draw all the segments
	 */
	function drawSegments(segments) {
		context.strokeStyle = 'black';
		context.beginPath();
		for (let segment of segments) {
			context.moveTo(segment[0].x, segment[0].y);
			context.lineTo(segment[1].x, segment[1].y);
		}
		context.stroke();

		context.fillStyle = 'yellow';
		for (let light of lights) {
			drawLight(light);
		}
	}

	/**
	 * Method to draw the shadows
	 */
	function drawShadows(shadowEdge) {
		context.fillStyle = 'black';
		for (let polygon of shadowEdge) {
			context.beginPath();
			context.moveTo(polygon[0].x, polygon[0].y);
			for (let node of polygon) {
				context.lineTo(node.x, node.y);
			}
			context.fill();
		}
	}

	function mainLoop () {
		requestAnimationFrame(mainLoop);
		var now = Date.now(),
			delta = now - timePreviousFrame;

		// cap the refresh to a defined FPS
		if (delta > interval && needsRefresh) {
			timePreviousFrame = now - (delta % interval);

			context.clearRect(0, 0, canvas.width, canvas.height);
			let lightRays = generateLightRays();
			let shadowEdge = generateShadows(lightRays);
			drawSegments(segments);
			drawShadows(shadowEdge);
			needsRefresh = false;
		}
	}

	canvas.addEventListener('mousemove', function (e) {
		let rect = canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;

		lights[0].x = x;
		lights[0].y = y;

		needsRefresh = true;
	});

	timePreviousFrame = Date.now();
	mainLoop();
})();
