(function() {
	let canvas = document.getElementById("my-canvas");
	let context = canvas.getContext("2d");
	let timePreviousFrame,
		maxFPS = 60,
		interval = 1000 / maxFPS;
	let needsRefresh = true;

	let nodes = [
		// polygon 1
		[10, 10],
		[70, 10],
		[70, 100],
		[10, 100],

		// polygon 2
		[130, 30],
		[140, 40],
		[120, 110],
		[120, 80],
		[90, 60],
		// border
		[0, 0],
		[canvas.width, 0],
		[canvas.width, canvas.height],
		[0, canvas.height]

	];

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
		[150, 150]
	];

	/**
	 * Draw a "bulb", just a disc
	 */
	function drawLight(light) {
		context.beginPath();
		context.arc(light[0], light[1], 5, 0, 2 * Math.PI, false);
		context.fill();
	}

	/**
	 * Get the intersection coordinates between a ray (semi line) and a segment
	 */
	function getRaySegmentIntersection(ray, segment) {
		let rayX, rayY, segmentX, segmentY, distXs, distYs, dotProduct;
		rayX = ray[1][0] - ray[0][0];
		rayY = ray[1][1] - ray[0][1];
		segmentX = segment[1][0] - segment[0][0];
		segmentY = segment[1][1] - segment[0][1];

		// parallel, ignore
		if (rayY / rayX == segmentY / segmentX) {
			return null;
		}

		let s, t;
		distXs = ray[0][0] - segment[0][0];
		distYs = ray[0][1] - segment[0][1];
		dotProduct = -segmentX * rayY + rayX * segmentY;
		s = (-rayY * distXs + rayX * distYs) / dotProduct;
		t = ( segmentX * distYs - segmentY * distXs) / dotProduct;

		if (s >= 0 && s <= 1 && t >= 0) {
			return {
				param: t,
				point: [
					ray[0][0] + (t * rayX),
					ray[0][1] + (t * rayY)
				]
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
		return point[0] + '-' + point[1];
	}

	/**
	 * Generates the rays of lights and the area in shadow based on the position
	 * of the ligh and the segments.
	 */
	function generateShadows() {
		let shadowEdge = [];
		for (let node of nodes) {
			if (getPointKey(lights[0]) == getPointKey(node)) {
				continue;
			}
			let shadowNodes = generateLightToNodeShadow(lights[0], node);
			for (shadowNode of shadowNodes) {
				shadowEdge.push(shadowNode);
			}
		}

		shadowEdge.sort(function (a, b) {
			let angle1, angle2;
			angle1 = Math.atan2(
				a[1] - lights[0][1],
				a[0] - lights[0][0]
			);
			angle2 = Math.atan2(
				b[1] - lights[0][1],
				b[0] - lights[0][0]
			);
			return angle1 - angle2;
		});

		return shadowEdge;
	}

	function generateLightToNodeShadow(light, node) {
		let lightRay = [light, node];
		let closestSegment = null;
		let exactIntersections = {};
		// find which is the closest segment the ray is touching
		for (let segment of segments) {
			let intersectionPoint = getRaySegmentIntersection(
				lightRay,
				segment
			);

			if (!intersectionPoint) {
				continue;
			}

			let canBeClosest = true;
			// intersecting exactly at the end of the segment (the
			// intersection is the current node)
			if (intersectionPoint.param == 1) {
				let pointKey = getPointKey(intersectionPoint.point);
				// get the other extremity of the segment
				if (getPointKey(segment[0]) == pointKey) {
					intersectionPoint.segmentEnd = segment[1];
				}
				else {
					intersectionPoint.segmentEnd = segment[0];
				}

				// the light ray already passed by a segment sharing a common
				// point
				if (!(pointKey in exactIntersections)) {
					canBeClosest = false;
					exactIntersections[pointKey] = intersectionPoint;
				}
				else {
					let sideSegment = getPointSideFromLine(lightRay, intersectionPoint.segmentEnd);
					let sidePrevSegment = getPointSideFromLine(lightRay, exactIntersections[pointKey].segmentEnd);
					if (sideSegment != sidePrevSegment) {
						delete exactIntersections[pointKey];
					}
					else {
						canBeClosest = false;
					}
				}
			}

			if (canBeClosest && (!closestSegment || closestSegment.param > intersectionPoint.param)) {
				closestSegment = intersectionPoint;
			}
		}

		let returnValues = [];
		for (let key in exactIntersections) {
			if (closestSegment
				&&exactIntersections.hasOwnProperty(key)
				&& exactIntersections[key].param < closestSegment.param
			) {
				returnValues.push(exactIntersections[key].point);
			}
		}

		if (closestSegment) {
			returnValues.push(closestSegment.point);
		}

		return returnValues;
	}

	/**
	 * Returns -1 of the point is on a side of the line, 0 if they are aligned
	 * or 1 if the point is on the other side.
	 */
	function getPointSideFromLine(line, point) {
		let lineDeltaX = line[1][0] - line[0][0];
		let lineDeltaY = line[1][1] - line[0][1];
		let side = lineDeltaX * (point[1] - line[0][1]) - lineDeltaY * (point[0] - line[0][0]);
		return side && side / Math.abs(side);
	}

	/**
	 * Method to draw all the segments
	 */
	function drawSegments(segments) {
		context.strokeStyle = 'black';
		context.beginPath();
		for (let segment of segments) {
			context.moveTo(segment[0][0], segment[0][1]);
			context.lineTo(segment[1][0], segment[1][1]);
		}
		context.stroke();

		context.strokeStyle = 'green';
		context.fillStyle = 'yellow';
		for (let light of lights) {
			drawLight(light);
		}
	}

	/**
	 * Method to draw the shadows, for the moment draws the light rays (ha!)
	 */
	function drawShadow(shadowEdge) {
		context.beginPath();
		for (let node of shadowEdge) {
			context.moveTo(lights[0][0], lights[0][1]);
			context.lineTo(node[0], node[1]);
			context.arc(node[0], node[1], 2, 0, 2 * Math.PI, false);
		}
		context.stroke();
	}

	function mainLoop () {
		requestAnimationFrame(mainLoop);
		var now = Date.now(),
			delta = now - timePreviousFrame;

		// cap the refresh to a defined FPS
		if (delta > interval && needsRefresh) {
			timePreviousFrame = now - (delta % interval);

			let shadowEdge = generateShadows();

			context.clearRect(0, 0, canvas.width, canvas.height);
			drawSegments(segments);
			drawShadow(shadowEdge);
			needsRefresh = false;
		}
	}

	canvas.addEventListener('mousemove', function (e) {
		let rect = canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;

		lights[0][0] = x;
		lights[0][1] = y;

		needsRefresh = true;
	});

	timePreviousFrame = Date.now();
	mainLoop();
})();
