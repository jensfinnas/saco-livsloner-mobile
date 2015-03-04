var margin = {top: 0, right: 200, bottom: 30, left: 70},
    width = $("#viz").width() - margin.left - margin.right,
    height = $("#viz").height() - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var categories = [];
for (var i=0; i<filters.length; i++) {
	var col = filters[i];
	for (var j=0; j<col.length; j++) {
		categories.push(col[j].name_short)
	}
}
var color = d3.scale.category10()
	.domain(categories);


var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .tickSize(-width) // Ritar ut horisontella linjer över hela grafen genom att sätta ticksen till hela bredden
    .tickFormat(function(d) { return (d / 1000000) + " Mkr"; })
    .orient("left");

var baselineDraw = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.age) })
    .y(function(d) { return y(d.salary) });

var lineDraw = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.age) })
    .y(function(d) { return y(d.salary) });

var clip_above = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.age); })
    .y0(0)
    .y1(function(d) { return y(d.baseline); });

var clip_below = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.age); })
    .y0(function(d) { return y(height); })
    .y1(function(d) { return y(d.baseline); });

var area = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.age); })
    .y0(function(d) { return y(d.salary); })
    .y1(function(d) { return y(d.baseline); });

var area = d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.age); })
    .y0(function(d) { return y(d.baseline); })
    .y1(function(d) { return y(d.salary); });

var svg = d3.select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // fixerar skalorna för att lättare kunna jämföra graferna med varandra
  x.domain([19,85]);  // sätt x-axelns miniumun till lägsta åldern 19 år och maxet till 68 år
  y.domain([0,23000000]);  // sätt lägsta inkomst till 0 kr och högsta inkomst till 23 miljoner

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("x", 0)
      .attr("transform","translate(" + width + ",0)")
      .attr("dy", "-.35em")
      .style("text-anchor", "end")
	  .attr("class", "caption")
      .text("Ålder");

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -10)
	  .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
	  .attr("class", "caption")
      .text("Livslön efter skatt")
      .attr("id", "yaxelEtikett");

  svg.append("g")
      .attr("class","baseline-group")
    .append("path")
      .attr("class", "baseline");

  // Flyttar etiketterna på y-axeln 6 pixlar till vänster så de får lite mer utrymme
  svg.selectAll(".y .tick text")
      .attr("dx", -6);

  // Ritar ut en "osynlig" brekEven-linje för att kunna förändra den när musen förs över linjer
  svg.append("line")
      .attr("class", "breakEven")
      .attr("y1", 0)
      .attr("y2", height)
      .style("stroke", "rgb(6,120,155)")
      .attr("opacity", 0);

  svg.append("clipPath")
      .attr("id", function(d) { return "clip-above"; })
    .append("path");

  svg.append("clipPath")
      .attr("id", function(d) { return "clip-below"; })
    .append("path");

function getBreakEvenPoint(column, baselineColumn, data) {
  for (var i = 0; i < data.length; i++) {
    if (+data[i][column] > +data[i][baselineColumn]) {
      return { age: data[i]['alder'], salary: +data[i][baselineColumn] };
    }
  }
  return false;
}


function _updateGraph() {
  d3.tsv("data.tsv", function(error, data) {
  data = data.filter(function(d) { return +d['alder'] <= 85 });

  var baselineColumn = _baseline(); // Hämta rätt baslinje
  var baseFinalSalary = data[data.length-1][baselineColumn]; // Hämta slutlön för baseline

    // Hämta alla aktiva filter och baslinjer som arrays
    var active_filters = $("#filters .btn.selected").map(function() { 
        var o = $(this);
		var column = o.attr("data-column");
		var category = o.attr("data-category");
        var label = o.attr("data-label");
          return { 
            column: column,
			category: category,
            label: label,
            finalSalary: data[data.length-1][column],
			type: 'normal',
            values: data.map(function(d) { 
              return { age: +d['alder'], salary: +d[column], baseline: +d[baselineColumn]}; 
            })  
         };  
      }).get();

	// En funktion för att räkna ut vilken baseline som ska användas.
    function _baseline() {
  		var active_baselines = $("#filters .btn.selected").map(function() { return $(this).attr("data-baseline") }).get();
        	if(active_baselines.length>0) {
          for (var i=0; i<active_baselines.length; i++) {
            // Om något av värderna i arrayen avviker från första värdet så sätts baselinen till total för gymnasiet
            if(active_baselines[i]!==active_baselines[0]) {
              return "GymnSamhNatv";
            } 
            } return active_baselines[0];   
        } else {return "GymnSamhNatv";}   
    }
  
  // Skriv ut korrekt namn för baslinjen baserat på vilken baslinje det är
  var baselineLabel = ""; 
  switch (_baseline())
    {
    case "GymnSamhNatv":
      baselineLabel="Totalt Gymnasie";
      break;
    case "GymnSamhv":
      baselineLabel="Gymnasiet - Samhällsvetarprogrammet";
      break;
    case "GymnNatv":
      baselineLabel="Gymnasiet - Naturvetarprogrammet";
      break;
    }

	// Definiera data för baseline
	var currentBaseline = {
		column: baselineColumn,
		label: baselineLabel, 
		finalSalary: data[data.length-1][baselineColumn],
		type: 'baseline',
		values: data.map(function(d) {
				return {age: +d['alder'], salary: +d[baselineColumn], baseline: +d[baselineColumn]};
			})
		};

	active_filters.push(currentBaseline); 
	active_filters.sort(function(a,b){ return b.finalSalary - a.finalSalary; }); // Sortera i storleksornind


    var line_group = svg.selectAll(".line_group")
      .data(active_filters, function(d) {return d.column;});
     
    var new_lines = line_group.enter()
      .append("g")
        .attr("class", function(d) { return "line_group "+d.type; })
		.attr("data-column", function(d) { return d.column; })
    .attr("data-livslon", function(d) { return d.finalSalary; })
    .attr("data-label", function(d) { return d.label; });

    line_group.exit().remove();

    new_lines.append("path")
      .attr("class", "line")
	  .attr("stroke", function(d) { 
        $('#filters .btn.selected[data-category="'+d.category+'"]').css('background-color',color(d.category));
        return color(d.category); }
        )
      .attr("d", function(d) { return lineDraw(d.values); });

  // Ritar ut area för varje kurva
  backgroundArea = new_lines.append("g")
      .attr("class", "backgroundArea"); // Kanske måste göras om för att få till ordentlig sortering

  backgroundArea.append("path")
      .attr("class", "area-above")
      .attr("clip-path", function(d) { return "url(#clip-below)"; })

  backgroundArea.append("path")
      .attr("class", "area-below")
      .attr("clip-path", function(d) { return "url(#clip-above)"; })

  svg.selectAll(".backgroundArea").attr("opacity", 0);

  var getAdjustedYPos = function(v) {
    var y0 = y(v);
    var diff = y0 - prevY;
    if (diff>15) {
      prevY = y0;
      return 0;
    }
    else {
      diff = 15 - diff;
      prevY = y0 + diff;
      return diff;
    }
  };

  var label = new_lines
    .append("g")
    .attr("transform", function(d) { 
      return "translate(" + width + "," + y(data[data.length-1][d.column]) + ")" } )
    .attr("class", "label");
    
  var prevY = -100;
  label.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 20)
    .attr("y2", function(d) { return getAdjustedYPos(data[data.length-1][d.column]) })
	.attr("stroke", function(d) { return color(d.category); })
    .attr("class", "line")
  
  var labelText = label.append('text')
    .text(function(d) { 
      switch (d.label)
        {
        case "Bibliotekarie och informationsvetare":
          d.label="Biblioteks- & infovet.";
          break;
        case "Organisation, administration & förvaltning":
          d.label="Org., admin. & förvaltning";
          break;
        case "Lärare i praktiskt-estetiskt ämne":
          d.label="Lärare prak./estetiskt ämne";
          break;
        }
      return d.label })
    .style("text-anchor", "start")
    .attr("dy", ".35em")
    .attr("x", 25);
  
  var prevY = -100;
  line_group.selectAll(".label text").transition()
    .duration(300)
    .attr("y", function(d) { return getAdjustedYPos(data[data.length-1][d.column]) })

  prevY = -100;
  line_group.selectAll(".label line").transition()
    .duration(300)
    .attr("y2", function(d) { return getAdjustedYPos(data[data.length-1][d.column]) })

  // Uppdaterar arean under varje linje
    var areaBaselineData = $("#filters .btn.selected").map(function() { 
      var o = $(this);
      var column = o.attr("data-column");
      var category = o.attr("data-category");
      var label = o.attr("data-label");
      return { 
            column: column,
            values: data.map(function(d) { 
              return { age: +d['alder'], salary: +d[column], baseline: +d[baselineColumn]}; 
            })  
         };  
      }).get();

    var backgroundAreaUpdate = svg.selectAll(".backgroundArea")
        .data(areaBaselineData, function(d) { return d.column;});

    backgroundAreaUpdate.select(".area-above")
        .attr("d", function(d) { return area(d.values); });

    backgroundAreaUpdate.select(".area-below")
        .attr("d", function(d) { return area(d.values); });

    var clippingPath = data.map(function(d) { 
                  return { age: +d['alder'], baseline: +d[baselineColumn]};
                });

    svg.select("#clip-below").data(clippingPath)
      .select("path")
        .attr("d", function(d) { return clip_below(clippingPath); });

    svg.select("#clip-above").data(clippingPath)
      .select("path")        
        .attr("d", function(d) { return clip_above(clippingPath); }); 

  // Sortera linje-grupperna för att få rätt mouseover-effekt
  svg.selectAll('.line_group').sort(function(a,b){
    return Math.abs(baseFinalSalary - b.finalSalary) - Math.abs(baseFinalSalary - a.finalSalary);
  })

  // Lägger till bakgrunden och label från början om det bara är två linjer
  if(active_filters.length==2) {
      var opacitybackgroundArea = $(".normal").find(".backgroundArea");
      opacitybackgroundArea.attr("opacity", 1);

      // Variabler för att skapa legend och breakEven - plockas från aktuellt markerad linje
      var column = $(".normal").attr("data-column");
      var baselineColumn = $('.line_group.baseline').attr("data-column");
      var columnLabel = $(".normal").attr("data-label").charAt(0).toLowerCase() + $(".normal").attr("data-label").slice(1);
      var livslon = ((+$(".normal").attr("data-livslon"))/1000000).toFixed(1);
      /*var livslon = numberWithCommas(+$(".normal").attr("data-livslon"));
      function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      }*/
      var utbildningspremium = Math.round(Math.abs(((+$(".line_group.normal").attr("data-livslon"))/(+$('.line_group.baseline').attr("data-livslon"))-1)*100));

      legend_and_breakEven(column,baselineColumn,columnLabel,livslon,utbildningspremium); //Skapar breakEven och label   

  } else {
      svg.selectAll(".line_group.normal").attr("opacity",1);
      svg.select(".breakEven")
        .transition()
        .duration(200)
        .attr('opacity', 0);
      svg.selectAll(".backgroundArea").attr("opacity", 0);
      $("#legend").addClass("transparent");
  }// END if(active_filters.length==2)

  function legend_and_breakEven(column,baselineColumn,columnLabel,livslon,utbildningspremium) {

      var breakEven = svg.select(".breakEven").transition().duration(200);
      var breakEvenPoint = getBreakEvenPoint(column, baselineColumn, data);
      var baselineLabel = $('.line_group.baseline').attr("data-column");
      if(livslon%1==0) { livslon = (+livslon).toFixed(0); } // tar bort decimalen om decimaltalet är noll
      livslon.replace(".",",");

      switch (baselineLabel)
      {
      case "GymnSamhNatv":
        baselineLabel="gymnasieutbildad";
        break;
      case "GymnSamhv":
        baselineLabel="samhällsvetenskapligt gymnasieutbildad";
        break;
      case "GymnNatv":
        baselineLabel="naturvetenskapligt gymnasieutbildad";
        break;
      }

      if (breakEvenPoint['age'] > 0) {
          if(column=="Akademiker_totalt") {columnLabel="genomsnittlig akademiker";};
          if(column=="Org_adm") {columnLabel="organisation, administration & förvaltningsutbildad";};
          breakEven
              .attr("x1", function(d) { return x(breakEvenPoint.age); })
              .attr("x2", function(d) { return x(breakEvenPoint.age); })
              .attr("y1", function(d) { return y(breakEvenPoint.salary); })
              .attr('opacity', 1);   
          if((+utbildningspremium)>0) {
            $("#legend").find(".panel-body").html("Vid <b>"+breakEvenPoint['age']+" års</b> ålder har en "+columnLabel+" tjänat in sin utbildning. Livslönen för en "+columnLabel+" är <b class='nowrap'>"+livslon+" miljoner kronor</b>, vilket är ca <b>"+utbildningspremium+"% mer</b> än genomsnittet för en "+baselineLabel+".");  
          } else {
              $("#legend").find(".panel-body").html("Vid <b>"+breakEvenPoint['age']+" års</b> ålder har en "+columnLabel+" tjänat in sin utbildning. Livslönen för en "+columnLabel+" är <b class='nowrap'>"+livslon+" miljoner kronor</b>, vilket är <b>lika mycket</b> som genomsnittet för en "+baselineLabel+".");  
          }     
      } else if(column!="GymnSamhNatv"&&column!="GymnSamhv"&&column!="GymnNatv") {
          breakEven
              .attr('opacity', 0);
          if((+utbildningspremium)==0) {
            $("#legend").find(".panel-body").html("En "+columnLabel+" tjänar aldrig in sin utbildning. Livslönen för en "+columnLabel+" är <b class='nowrap'>"+livslon+" miljoner kronor</b>, vilket är <b>lika mycket</b> som genomsnittet för en "+baselineLabel+".");  
          } else {
            $("#legend").find(".panel-body").html("En "+columnLabel+" tjänar aldrig in sin utbildning. Livslönen för en "+columnLabel+" är <b class='nowrap'>"+livslon+" miljoner kronor</b>, vilket är ca <b>"+utbildningspremium+"% mindre</b> än genomsnittet för en "+baselineLabel+".");  
          }   
      } else if(column=="GymnSamhNatv"||column=="GymnSamhv"||column=="GymnNatv") {
          breakEven
              .attr('opacity', 0);
            switch (column)
              {
              case "GymnSamhNatv":
                columnLabel="gymnasieutbildning";
                break;
              case "GymnSamhv":
                columnLabel="samhällsvetenskaplig gymnasieutbildning";
                break;
              case "GymnNatv":
                columnLabel="naturvetenskaplig gymnasieutbildning";
                break;
              }
          $("#legend").find(".panel-body").html("Livslönen för en person med endast "+columnLabel+" är <b class='nowrap'>"+livslon+" miljoner kronor</b>.");     
      }

      $("#legend").removeClass("transparent");
      $("#legend").find(".panel-heading").text(columnLabel.charAt(0).toUpperCase() + columnLabel.slice(1)); //hack för att göra första bokstaven stor

    }

  //mouseover Händelser då musen förs över en linje eller linje-etikett
  $(".line_group").mouseover(function() {
  
    // Gör alla linjer som inte musen är över genomskinliga
    var opacityLines = $(".line_group.normal").not(this);
    opacityLines.attr("opacity",0.1);

    // Variabler för att skapa legend och breakEven - plockas från aktuellt markerad linje
    var column = $(this).attr("data-column");
    var baselineColumn = $('.line_group.baseline').attr("data-column");
    var columnLabel = $(this).attr("data-label").charAt(0).toLowerCase() + $(this).attr("data-label").slice(1);
    var livslon = ((+$(this).attr("data-livslon"))/1000000).toFixed(1);
    /* Bortkommenderad funktion för att göra livslönen helt utskriven med mellanrum som tusenavgränsare
    var livslon = numberWithCommas(+$(this).attr("data-livslon"));
    function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    } */
    var utbildningspremium = Math.round(Math.abs(((+$(this).attr("data-livslon")/+$('.line_group.baseline').attr("data-livslon"))-1)*100));

    legend_and_breakEven(column,baselineColumn,columnLabel,livslon,utbildningspremium); //Skapar breakEven och label    

    // Gör arean mellan aktuellt markerad linje och baslinjen färgad
    if(column!="GymnSamhNatv"&&column!="GymnSamhv"&&column!="GymnNatv") {
      var opacitybackgroundArea = $(this).find(".backgroundArea");
      opacitybackgroundArea.attr("opacity", 1);
    }
  }); // SLUT mouseover

  // Händelser då musen förs ifrån linje eller linje-etikett
  $(".line_group").mouseout(function() {
        svg.selectAll(".line_group.normal").attr("opacity",1);
        svg.select(".breakEven")
          .transition()
          .duration(200)
          .attr('opacity', 0);
        svg.selectAll(".backgroundArea").attr("opacity", 0);
        $("#legend").addClass("transparent");
  }); // SLUT mouseout

  })

  // Send height to parent
  var isIframe = self !== top;
  if (isIframe) {
    var pymChild = new pym.Child();
    pymChild.sendHeight();
  }
}


$("#yaxelEtikett").tooltip({
    'container': 'body',
    'placement': 'right',
    'title' : 'I begreppet livslön inräknas både lön och pension efter skatt, studiemedel räknas som inkomst under studietiden. Den årliga avbetalningen av studieskulden dras bort från lönen under återbetalningstiden. Hänsyn tas till att risken för arbetslöshet varierar mellan olika akademikergrupper och gymnasieutbildade. Alla beräkningar är gjorda utifrån 2009 års siffror.'
});

_updateGraph(); // Kör _updateGraph() en första gång så att grafen ritas ut när sidan laddas