Livsloner = (function() {
	function Livsloner(selector, mobile, data, groups) {
		var self = this;
		self.mobile = mobile;
		self.data = data;
		self.groups = groups;
		self.container = d3.select(selector);
		var containerWidth = self.container[0][0].offsetWidth;
		
		self.chartContainer = self.container.append("div")
			.attr('class', 'chart ' + (mobile ? 'mobile' : 'desktop'));

		self.sentenceContainer = self.container.append("div")
			.attr('class', 'sentence');

		var desktopMargins = {top: 10, right: 200, bottom: 30, left: 70};
		var mobileMargins = {top: 10, right: 40, bottom: 30, left: 27};

		self.margin = m = mobile ? mobileMargins : desktopMargins;
		self.width = (containerWidth - m.left - m.right);
		var _height = mobile ? 270 : 400;
		self.height = _height - m.top - m.bottom;

		self.drawNavigation();
		self.drawCanvas();
		self.initChart();
	}
	Livsloner.prototype.drawNavigation = function() {
		var self = this;
		// Draw mobile ui
		if (self.mobile) {
			self.navigationContainer = self.container
				.insert("div",":first-child")
				.attr('class', 'navigation');
			var templateElement = d3.select("#navigation-mobile");
		}
		else {
			self.navigationContainer = self.container
				.append("div")
				.attr('class', 'navigation ' + (self.mobile ? 'mobile' : 'desktop'));
			var templateElement = d3.select("#navigation-desktop");
		}
		var source   = templateElement.html();
		var template = Handlebars.compile(source);

		self.navigationContainer.html( template( self.groups ) );
		self.navigationContainer.selectAll('.profession').on("change", function() {
			self.update();
		});
		/* 	In desktop check all professions when a group heading is clicked. 
			And uncheck the others.
		*/
		self.navigationContainer.selectAll('.panel-heading').on('click', function() {
			d3.selectAll('.profession').property('checked', false);
			d3.select(this.parentElement).selectAll('.profession').property('checked', true);
			self.update();
		})
	};

	// Draw base svg
	Livsloner.prototype.drawCanvas = function() {
		var self = this;
		var w = self.width;
		var h = self.height;
		var m = self.margin;

		self.svg = self.chartContainer.append('svg')
		  .attr('width', w + m.left + m.right)
		  .attr('height', h + m.top + m.bottom);

		self.chart = self.svg
		  .append('g')
		  .attr("transform", "translate(" + (m.left) + "," + (m.top) + ")")
	};

	// Set up scales, draw axes and labels
	Livsloner.prototype.initChart = function() {
		var self = this;
		self.x = d3.scale.linear()
		    .range([0, self.width])
		    .domain([19,85]); 

		self.y = d3.scale.linear()
		    .range([self.height, 0])
		    .domain([0,23000000]);

		self.xAxis = d3.svg.axis()
		    .scale(self.x)
		    .orient("bottom");

		self.yAxis = d3.svg.axis()
		    .scale(self.y)
		    //.tickSize(-self.width)
		    .tickFormat(function(d) { return d / 1000000 })
		    .orient("left");

		self.line = d3.svg.line()
          .interpolate('linear')
          .x(function(d){ return self.x(d.age) })
          .y(function(d){ return self.y(d.salary) });

        /*self.areaAboveBaseline = d3.svg.area()
            .x(function(d) { return x(d.age); })
            .y0(0)
            .y1(function(d) { return y(d.baseline); });

        self.areaBelowBaseline = d3.svg.area()
            .x(function(d) { return x(d.age); })
            .y0(function(d) { return y(self.height); })
            .y1(function(d) { return y(d.baseline); });*/

        self.overlay = self.svg.append('rect')
        	.attr('class', 'overlay')
        	.attr('width', self.width + self.margin.left + self.margin.right)
        	.attr('height', self.height + self.margin.top + self.margin.bottom)
        	.attr('fill', '#fff');


		 self.chart.append("g")
		      .attr("class", "x axis")
		      .attr("transform", "translate(0," + self.height + ")")
		      .call(self.xAxis)
		    .append("text")
		      .attr("x", 0)
		      .attr("transform","translate(" + self.width + ",0)")
		      .attr("dy", "-.35em")
		      .style("text-anchor", "end")
			  .attr("class", "caption")
		      .text("Ålder");

		  self.chart.append("g")
		      .attr("class", "y axis")
		      .call(self.yAxis)
		    .append("text")
		      .attr("transform", "rotate(-90)")
		      .attr("x", -10)
			  .attr("y", 6)
		      .attr("dy", ".71em")
		      .style("text-anchor", "end")
			  .attr("class", "caption")
		      .text("Livslön efter skatt (Mkr)");

	};
	Livsloner.prototype.drawBaseline = function() {
		var self = this;
	};
	Livsloner.prototype.updateLines = function(callbacks) {
		var self = this;
		var lineGroup = self.lineGroups.enter()
			.append('g')
			.attr('class', function(d,i) {
				return 'line-group ' + (i == 0 ? 'baseline' : 'profession-line')
			});

		var path = lineGroup.append("path")
			.datum(function(d) { return d.values })
			.attr("class", "line")
			.attr("d", self.line);

		var hoverPath = lineGroup.append("path")
			.datum(function(d) { return d.values })
			.attr("d", self.line)
			.attr('stroke-width', 10)
			.attr('stroke', '#fff')
			.attr('opacity', 0.0001)
			.attr('fill', 'none')
			.on('mouseover', function() {
				var hoveredLineGroup = this.parentElement;
				self.lineGroups.classed('faded', function() {
					return this !== hoveredLineGroup;
				})
			})
			.on('mouseout', function() {
				self.lineGroups.classed('faded', false);
			});

		// Animate entering lines
		var animationDuration = 300;

		var totalLength;
		path[0].forEach(function(node) {
			if (node) {
				totalLength = Math.max(node.getTotalLength(), totalLength);
			}
		});
		var numberOfExistingLines = lineGroup[0].filter(function(d) {
			return d === null;
		}).length;
		path.attr("stroke-dasharray", totalLength + " " + totalLength)
			.attr("stroke-dashoffset", totalLength)
			.transition()
			.duration(animationDuration)
			.delay(function(d,i) {
				return (i - numberOfExistingLines) * animationDuration;
			})
			.ease("linear")
			.attr("stroke-dashoffset", 0)
			// Add break even after animation
			.call(transitionEnd, function() { run(callbacks) });
		
		// Remove unselected professions
		self.lineGroups.exit().transition()
			.remove()
			.call(transitionEnd, function() { run(callbacks) });

	};
	

	Livsloner.prototype.addBreakEven = function(args) {
		var self;
		if (args.self) {
			self = args.self;
		}
		else {
			self = this;
		}
		if (self.breakEven) {
			var cx = self.x(self.breakEven.age);
			var cy = self.y(self.breakEven.salary);
			var reverseLabel = self.width - cx < 50; 
			var radius = 5; 
			self.breakEvenGroup = self.chart.append('g')
				.attr('transform', 'translate(' + [cx, cy] +')')
				.attr('class', 'break-even annotation');

			self.breakEvenGroup.append('circle')
				.attr('r', 0)
				.transition()
				.duration(800)
				.ease('bounce')
				.attr('r', radius);

			self.breakEvenGroup.append('text')
				.text(self.breakEven.age + ' år')
				.attr('dy', '.35em')
				.attr('x', ((radius + 4) * (reverseLabel ? -1 : 1)))
				.attr('class', 'label')
				.attr('text-anchor', reverseLabel ? 'end' : 'start')
		}
	};

	Livsloner.prototype.addSentence = function(args) {
		var self;
		if (args.self) {
			self = args.self;
		}
		else {
			self = this;
		};
		var sentence = getSentence(self.breakEven, self.finalSalaries);
		self.sentenceContainer.html(sentence);
	}
	Livsloner.prototype.annotateDifference = function(args) {
		var self;
		if (args.self) {
			self = args.self;
		}
		else {
			self = this;
		}
		if (self.finalSalaries) {
			var _y = (self.y(self.finalSalaries.baseline) + self.y(self.finalSalaries.profession)) / 2;
			var lineHeight = self.height - self.y(Math.abs(self.finalSalaries.difference));
			var direction = self.finalSalaries.difference > 0 ? 'plus' : 'minus';
			var g = self.chart.append('g')
				.attr('class', 'difference annotation ' + direction)
				.attr('transform', 'translate(' + [self.width, _y] +')');

			g.append('line')
				.attr("x1", 0)
				.attr("x2", 0)
				.attr("y1", -lineHeight / 2)
				.attr("y2", lineHeight / 2);

			g.append('text')
				.attr('dy', '.75em')
				.attr('y', 5)
				.attr('transform', 'rotate(-90)')
				.text((self.finalSalaries.difference > 0 ? '+' : '') + formatMillionSEK(self.finalSalaries.difference));
		}

	};
	Livsloner.prototype.annotateLines = function(args) {
		var self;
		if (args.self) {
			self = args.self;
		}
		else {
			self = this;
		}
		var coordinates = {
			above: { x: 0.2, y: 0.32},
			below: { x: 0.5, y: 0.8},
		}
		var g = self.lineGroups.append('g')
			.attr('class', 'line-label annotation')
			.attr('transform', function(d,i) {
				var position;
				var isBaseline = i == 0;
				if (isBaseline) {
					// Place baseline label below line if 
					position = self.breakEven.age < 55 ? 'below' : 'above'
				}
				else {
					position = self.breakEven.age < 55 ? 'above' : 'below'					
				}
				var x = coordinates[position].x * self.width;
				var y = coordinates[position].y * self.height;
				return 'translate('+[x,y]+')';
			});
		g.append("text").each(function (d) {
			var label = addLineBreaks(d.label, 15);
			addLineBreaksToSVG(str, this);
		});

		var colorKeySize = 6;
		g.append("rect")
			.attr('class', 'color-key')
			.attr('x', -colorKeySize - 4)
			.attr('y', -7)
			.attr('width', colorKeySize)
			.attr('height', colorKeySize);
	}

	Livsloner.prototype.updateDesktopLabels = function(args) {
		var self;
		if (args.self) {
			self = args.self;
		}
		else {
			self = this;
		}

		/*	We use a force layout to dynamically place labels and (almost) prevent overlap.

		*/
		var foci = [],
          labels = [];

        self.lineGroups.transition().each(function(d, i) {
        	var x = self.width;
        	var y = self.y(d.finalSalary);
        	foci.push({x: x, y: y });
        	labels.push({x: x, y: y, x0: x, y0: y, label: d.label})
        });

        var labelGroups = self.chart.selectAll('.label-group')
          .data(labels, function(d) { return d.label; });

        var newLabelGroups = labelGroups.enter().append('g')
			.attr('class', 'label-group')
			.attr('transform', function(d) {
				return 'translate('+[d.x, d.y]+')'
			});

		newLabelGroups.append('text')
			.each(function(d) {
				var str = addLineBreaks(d.label, 15);
				addLineBreaksToSVG(str, this)					
			})
			.attr('transform', 'translate(19,0)');

		newLabelGroups.append('line')
			.attr('x1', 4)
			.attr('x2', 15)
			.attr('y1', 0)
			.attr('y2', 0)
			.attr('stroke','#333')

		var force = d3.layout.force()
		    .nodes(labels)
		    .charge(-20)
		    .gravity(0)
		    .size([self.width, self.height]);

		force.on("tick", function(e) {
		    var k = .1 * e.alpha;
		    labels.forEach(function(o, j) {
		        // The change in the position is proportional to the distance
		        // between the label and the corresponding place (foci)
		        o.y += (foci[j].y - o.y) * k;
		        o.x += (foci[j].x - o.x) * k;
		    });
		    // Update the position of the text element
		    self.chart.selectAll(".label-group")
		    	.attr('transform', function(d) {
		    		return 'translate('+[d.x, d.y]+')';
		    	});

		    self.chart.selectAll(".label-group line")
		    	.attr('y1', function(d) {
		    		return d.y0 - d.y;
		    	});
		});
		force.start();

		labelGroups.exit().remove();
	};

	/*Livsloner.prototype.removeLines = function() {
		var self = this;
		self.lineGroups.exit().remove();
	};*/
	Livsloner.prototype.removeAnnotation = function() {
		var self = this;
		self.chart.selectAll('.annotation').remove();
		self.sentenceContainer.html('');
	};

	Livsloner.prototype.update = function() {
		var self = this;

		// Get selected professions
		var selectedProfessions = getSelectedProfessions();
		// Add baseline
		if (selectedProfessions.length) {
			var column = getBaseLineColumn(selectedProfessions);
			selectedProfessions.unshift( {
				label: getBaseLineLabel(column),
				column: column 
			});	
		}

		self.container.classed('no-selection', selectedProfessions.length == 0);

		// Get selected columns from data
		var lineData = getDataPoints(self.data, selectedProfessions);

		self.lineGroups = self.chart.selectAll('g.line-group')
			.data(lineData, function(d) { return d.column; });

		// Remove exiting lines
		self.removeAnnotation();

		// Add break even after lines are drawn if there is only one line (+ baseline)
		var callbacks = [];
		if (!self.mobile) {
			callbacks.push({
				fn: self.updateDesktopLabels,
				args: { self: self }
			})
		}
		if (lineData.length == 2) {
			self.breakEven = getBreakEvenPoint(lineData);
			self.finalSalaries = getFinalSalaries(lineData);

			callbacks.push({ 
				fn: self.addBreakEven,
				args: { self: self }
			}, 
			{
				fn: self.addSentence,
				args: { self: self }
			});

			// Highligt the final salary diff in mobile
			if (self.mobile) {
				callbacks.push({
					fn: self.annotateDifference,
					args: { self: self }
				},
				{
					fn: self.annotateLines,
					args: { self: self }
				});	
			}
			


			/* 	Show break even also if we move from multiple selected to two.
				In those cases there won't be any animations, and therefore no animation
				callbacks.
			*/
			var numberOfEnteringLines = self.lineGroups.enter()[0].filter(function(d) { return d; }).length;
			if (numberOfEnteringLines == 0) {
				run(callbacks);
			}
		}

		// Draw lines
		self.updateLines(callbacks);


	};
	// Util functions
	var getSelectedProfessions = function() {
		var selectedProfessions = [];
		if (app.mobile) {
			var value = $('.profession').val();
			if (value) {
				selectedProfessions.push(value);
			}
		}
		else {
			$('.profession:checked').each(function() {
				selectedProfessions.push( $(this).val() );
			});	
		}
		return selectedProfessions.map(function(d) {
			var values = d.split('|');
			return {
				label: values[0],
				column: values[1],
				baseline: values[2]
			}
		});
	}

	var getDataPoints = function(data, selectedProfessions) {
		return selectedProfessions.map(function(profession) {
			return {
				column: profession.column,
				label: profession.label,
				finalSalary: data[data.length - 1][profession.column],
				values: data.map(function(d) {
					return {
						age: d.alder,
						salary: d[profession.column]
					};
				})
			}
		});
	}

	var getBaseLineColumn = function(selectedProfessions) {
		var baselines = selectedProfessions.map(function(profession) {
			return profession.baseline;
		});
		return baselines.allValuesSame() ? baselines[0] : 'GymnTotal';
	}
	var getBaseLineLabel = function(column) {
		if (column == 'GymnSamhv') {
			return 'Samhällsvetenskapligt gymnasieutbildad';
		}
		else if (column == 'GymnNatv') {
			return 'Naturvetenskapligt gymnasieutbildad';
		}
		else {
			return 'Gymnasieutbildad';
		}
	}

	var getBreakEvenPoint = function(lineData) {
		for (var i = 0; i < lineData[0].values.length; i++) {
			var baselineValue = lineData[0].values[i].salary;
			var salary = lineData[1].values[i].salary;

			if (salary > baselineValue) {
				return lineData[0].values[i];
			}
		}
		// Salary projection never passes baseline
		return false;
	}

	var getSentence = function(breakEven, finalSalaries) {
		var str = '';
		var comparator;
		if (breakEven) {
			str = 'Vid ' + breakEven.age + ' år har du tjänat lika mycket som en gymnasieutbildad.';
			comparator = 'mer';
		}
		else {
			str += 'Du kommer aldrig i kapp en gymnasieutbildad i livslön.';
			comparator = 'mindre';
		}
		str +=  ' Din livslön är ' + formatInSentence(finalSalaries.profession) + ', ' + formatInSentence(Math.abs(finalSalaries.difference)) + ' ' + comparator + ' än en gymnasieutbildads.';
		return str;

	}

	// Get the final salaries of baseline and profession in compare mode
	var getFinalSalaries = function(lineData) {
		var baseline = lineData[0].finalSalary;
		var profession = lineData[1].finalSalary;
		return {
			baseline: baseline,
			profession: profession,
			difference: profession - baseline
		}
	}
	// Invoke callback when all d3 animations are done
	var transitionEnd = function(transition, callback) { 
	   var n = 0; 
	   transition 
	       .each(function() { ++n; }) 
	       .each("end", function() { if (!--n) callback.apply(this, arguments); }); 
	 }
	 var addLineBreaks = function(str, characterThreshold) {
	 	var characterThreshold = characterThreshold || 20;
	 	var arr = str.split(' ');
	 	var counter = 0;
	 	var newStr = '';
	 	arr.forEach(function(d) {
	 		if (counter + d.length > characterThreshold) {
	 			counter = 0;
	 			delimiter = '\n';
	 		}
	 		else {
	 			counter = counter + d.length;
	 			delimiter = ' ';
	 		}
	 		newStr += (d + delimiter)
	 	})
	 	return newStr;
	 }
	 var addLineBreaksToSVG = function(str, elem) {
	 	var arr = str.split("\n");
	 	if (arr != undefined) {
	 	    for (i = 0; i < arr.length; i++) {
	 	        d3.select(elem).append("tspan")
	 	            .text(arr[i])
	 	            .attr("dy", i ? "1.2em" : 0)
	 	            .attr("x", 0)
	 	            .attr("class", "tspan" + i);
	 	    }
	 	}
	 }

	 var run = function(callbacks) {
	 	callbacks.forEach(function(callback) {
	 		callback.fn(callback.args);
	 	})
	 }

	return Livsloner;
})();