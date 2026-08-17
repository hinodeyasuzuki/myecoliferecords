/**
 * Home-Eco Diagnosis for JavaScript
 *
 * graph: graph create Class
 *
 *
 * @author SUZUKI Yasufumi	2016/05/23
 *
 */

var wid;
var hei;

Chart.register(ChartDataLabels);

// newCanvas( targetSelector, wid, hei ) ------------------------------
//		append a fresh <canvas> to the target container and return it
function newCanvas(targetSelector, wid, hei) {
	var canvas = document.createElement("canvas");
	canvas.width = wid;
	canvas.height = hei;
	$(targetSelector).append(canvas);
	return canvas;
}

// colorToRgb( color ) --------------------------------------------------
//		resolve any valid CSS color (named color, hex, rgb()...) to {r,g,b}
//		via a throwaway canvas context, which normalizes it for us.
var colorToRgbCtx = document.createElement("canvas").getContext("2d");
function colorToRgb(color) {
	colorToRgbCtx.fillStyle = "#000";
	colorToRgbCtx.fillStyle = color;
	var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colorToRgbCtx.fillStyle);
	if (m) {
		return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
	}
	m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(colorToRgbCtx.fillStyle);
	return { r: +m[1], g: +m[2], b: +m[3] };
}

function rgbToHsl(r, g, b) {
	r /= 255;
	g /= 255;
	b /= 255;
	var max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	var h = 0,
		s = 0,
		l = (max + min) / 2;
	if (max != min) {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
	h /= 360;
	s /= 100;
	l /= 100;
	var r, g, b;
	if (s === 0) {
		r = g = b = l;
	} else {
		var hue2rgb = function (p, q, t) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	};
}

// shadeVariant( baseColor, index ) --------------------------------------
//		produce same-hue tint/shade variants of baseColor, cycling through
//		increasingly lighter/darker steps so several unlabeled items stay
//		recognizably "the same family" of color rather than unrelated hues.
var shadeLightnessSteps = [0, -20, 20, -35, 35, -48, 48];
function shadeVariant(baseColor, index) {
	var rgb = colorToRgb(baseColor);
	var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
	var delta = shadeLightnessSteps[index % shadeLightnessSteps.length];
	var l = Math.min(88, Math.max(12, hsl.l + delta));
	var rgb2 = hslToRgb(hsl.h, hsl.s, l);
	return "rgb(" + rgb2.r + "," + rgb2.g + "," + rgb2.b + ")";
}

// stackedSegmentLabelsPlugin ------------------------------------------
//		draws a value label centered in each stacked bar segment, mirroring
//		the original dimple afterDraw behaviour (skip segments under 8px
//		tall). Used instead of chartjs-plugin-datalabels' own center
//		alignment, whose "fits in box" check is pixel-rounding sensitive
//		and can flakily hide labels for smaller segments.
function stackedSegmentLabelsPlugin(formatValue) {
	return {
		id: "stackedSegmentLabels",
		afterDatasetsDraw: function (chart) {
			var ctx = chart.ctx;
			chart.data.datasets.forEach(function (dataset, datasetIndex) {
				var meta = chart.getDatasetMeta(datasetIndex);
				if (meta.hidden) return;
				meta.data.forEach(function (bar, index) {
					var value = dataset.data[index];
					if (!value) return;
					var height = Math.abs(bar.base - bar.y);
					if (height < 8) return;
					ctx.save();
					ctx.fillStyle = "#000";
					ctx.font = "10px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(formatValue(value), bar.x, (bar.y + bar.base) / 2);
					ctx.restore();
				});
			});
		}
	};
}

//graphItemize( ret ) ------------------------------------------------
//		draw itemized graph to div#graph
//		comment to div#graphcomment
// parameters
//		ret: graph data calcrated by D6
// global
//		hideAverage: 1,hide
function graphItemize(ret) {
	graphItemizeCommon(ret, "graph");
}

function graphItemizeCommon(ret, targetname) {
	if (!$("#" + targetname).is(":visible")) {
		return;
	}
	//caption: graph captions translate
	if (targetMode == 1) {
		var captions = {
			you: lang.younow,
			after: lang.youafter,
			average: lang.average
		};
	} else {
		var captions = {
			you: lang.officenow,
			after: lang.youafter,
			average: lang.average
		};
	}
	var titles = {
		kg: lang.co2emission + "（" + lang.co2unitperyear + "）",
		GJ: lang.primaryenergy + "（" + lang.energyunitperyear + "）",
		yen: lang.fee + "（" + lang.feeunitperyear + "）"
	};

	var captionCompareAverage = lang.comparetoaverage;
	var captionItem = lang.itemize;
	var captionCompare = lang.compare;
	var captionPercent = lang.percent;

	$("#" + targetname).html(
		"<h3>" +
		titles[ret.yaxis] +
		(hideAverage != 1
			? ":" +
			ret.averageCaption +
			captionCompareAverage +
			"（" +
			ret.consTitle +
			"）"
			: "") +
		"</h3>"
	);

	wid =
		Math.min(
			$("#" + targetname)
				.parent()
				.width(),
			$(window).width()
		) * 0.9;
	if (wid <= 0) return;
	hei = Math.max(wid * 0.4, 320);

	// redesign data for graph
	for (var c in ret.data) {
		if (pageMode == "m1") {
			//in case of no selection mode
			if (ret.data[c].compare == "after") {
				delete ret.data[c];
				continue;
			}
		}
		if (hideAverage == 1 && ret.data[c].compare == "average") {
			delete ret.data[c];
			continue;
		}
		//set language (other is not set in d6)
		if (ret.data[c].item == "other") {
			ret.data[c][captionItem] = lang.other;
		} else {
			ret.data[c][captionItem] = ret.data[c].item;
		}
		delete ret.data[c].item;
		ret.data[c][captionCompare] = captions[ret.data[c].compare];
		delete ret.data[c].compare;
		ret.data[c][captionPercent] = ret.data[c].ratio;
		delete ret.data[c].ratio;
		ret.data[c][titles[ret.yaxis]] = ret.data[c][ret.yaxis];
		delete ret.data[c][ret.yaxis];
	}
	var valueKey = titles[ret.yaxis];

	//X axis: sort data and set category order
	var categoryOrder = [];
	categoryOrder[0] = captions.you;
	if (pageMode == "m1") {
		if (hideAverage == 0) {
			categoryOrder[1] = captions.average;
		}
	} else {
		categoryOrder[1] = captions.after;
		if (hideAverage == 0) {
			categoryOrder[2] = captions.average;
		}
	}

	var valueByItemCategory = {};
	for (var r in ret.data) {
		var item = ret.data[r][captionItem];
		var category = ret.data[r][captionCompare];
		valueByItemCategory[item] = valueByItemCategory[item] || {};
		valueByItemCategory[item][category] = ret.data[r][valueKey];
	}

	//item order: derive the actual item set from the data itself (like dimple
	//did automatically), since ret.ord can be incomplete or stale for a
	//single-category view (D6.getItemizeGraph only fills it in properly for
	//the "TO"/overall view).
	var itemsInData = [];
	for (var r0 in ret.data) {
		var itemName = ret.data[r0][captionItem];
		if (itemsInData.indexOf(itemName) === -1) itemsInData.push(itemName);
	}
	var categoryOrderItems = [];
	for (var i = 0; i < ret.ord.length; i++) {
		var translated = ret.ord[i] == "other" ? lang.other : ret.ord[i];
		if (itemsInData.indexOf(translated) !== -1 && categoryOrderItems.indexOf(translated) === -1) {
			categoryOrderItems.push(translated);
		}
	}
	itemsInData.forEach(function (item) {
		if (categoryOrderItems.indexOf(item) === -1) categoryOrderItems.push(item);
	});

	//stack order (bottom to top), reversed like the original design
	var stackOrder = categoryOrderItems.slice().reverse();

	var colorByItem = {};
	for (var cid in ret.clist) {
		colorByItem[ret.clist[cid].title] = ret.clist[cid].color;
	}

	//items without a defined color (typically the sub-items shown when a
	//single category is selected, since ret.clist only carries the
	//category's own color in that case) get same-hue shades of that base
	//color instead of Chart.js's unrelated default palette. "その他" always
	//stays a plain gray.
	var baseColorForShades = (ret.clist[0] && ret.clist[0].color) || "#4dc9f6";
	var shadeIndex = 0;
	categoryOrderItems.forEach(function (item) {
		if (colorByItem[item]) return;
		if (item === lang.other) {
			colorByItem[item] = "#999999";
			return;
		}
		colorByItem[item] = shadeVariant(baseColorForShades, shadeIndex);
		shadeIndex++;
	});

	var datasets = stackOrder.map(function (item) {
		return {
			label: item,
			data: categoryOrder.map(function (category) {
				return (valueByItemCategory[item] && valueByItemCategory[item][category]) || 0;
			}),
			backgroundColor: colorByItem[item]
		};
	});

	var canvas = newCanvas("#" + targetname, wid, hei);
	var chart = new Chart(canvas, {
		type: "bar",
		data: { labels: categoryOrder, datasets: datasets },
		options: {
			responsive: false,
			maintainAspectRatio: false,
			scales: {
				x: { stacked: true, ticks: { font: { size: 13 } } },
				y: { stacked: true, ticks: { font: { size: 12 } } }
			},
			plugins: {
				legend: {
					position: "right",
					labels: {
						font: { size: 12 },
						generateLabels: function (chart) {
							return Chart.defaults.plugins.legend.labels
								.generateLabels(chart)
								.reverse();
						}
					}
				},
				datalabels: { display: false }
			}
		},
		plugins: [
			stackedSegmentLabelsPlugin(function (value) {
				return Math.round(value).toLocaleString() + "kg";
			})
		]
	});

	//comment-------------------
	var rat = [];
	var ratsum = 0;
	for (var i1 = 0; i1 < 3; i1++) {
		rat[i1] = 0;
		for (var i2 in ret.data) {
			if (
				ret.data[i2][captionCompare] == captions.you &&
				ret.data[i2][captionItem] == categoryOrderItems[i1]
			) {
				rat[i1] = ret.data[i2][captionPercent];
				ratsum += ret.data[i2][captionPercent];
				break;
			}
		}
	}
	var comment = lang.itemizecomment(
		(categoryOrderItems[0] || "") +
		"（" +
		rat[0] +
		"%）、" +
		(categoryOrderItems[1] || "") +
		"（" +
		rat[1] +
		"%）、" +
		(categoryOrderItems[2] || "") +
		"（" +
		rat[2] +
		"%）",
		Math.round(ratsum)
	);
	$("#" + targetname + "comment").html(comment);
}

// graphEnergy( averageData ) -----------------------------------------------------
//		energy compare to average
function graphEnergy(averageData) {
	if (!$("#graphEnergy").is(":visible")) {
		return;
	}

	$("#graphEnergy").html("");

	wid =
		Math.min(
			$("#graphEnergy")
				.parent()
				.width(),
			$(window).width()
		) * 0.95;
	if (wid <= 0) return;
	hei = Math.max(wid * 0.4, 320);

	var data = [
		{
			user: lang.youcall,
			energy: lang.electricitytitle,
			cons: Math.round(averageData.cost[0].electricity)
		},
		{
			user: lang.average,
			energy: lang.electricitytitle,
			cons: Math.round(averageData.cost[1].electricity)
		},
		{
			user: lang.youcall,
			energy: lang.gastitle,
			cons: Math.round(averageData.cost[0].gas)
		},
		{
			user: lang.average,
			energy: lang.gastitle,
			cons: Math.round(averageData.cost[1].gas)
		},
		{
			user: lang.youcall,
			energy: lang.kerosenetitle,
			cons: Math.round(averageData.cost[0].kerosene)
		},
		{
			user: lang.average,
			energy: lang.kerosenetitle,
			cons: Math.round(averageData.cost[1].kerosene)
		},
		{
			user: lang.youcall,
			energy: lang.gasolinetitle,
			cons: Math.round(averageData.cost[0].car)
		},
		{
			user: lang.average,
			energy: lang.gasolinetitle,
			cons: Math.round(averageData.cost[1].car)
		}
	];
	for (var c in data) {
		data[c][lang.fee] = data[c].cons;
		delete data[c].cons;
	}

	var energyOrder = [
		lang.electricitytitle,
		lang.gastitle,
		lang.kerosenetitle,
		lang.gasolinetitle
	];
	var userOrder = [lang.youcall, lang.average];

	var valueByUserEnergy = {};
	for (var r in data) {
		var user = data[r].user;
		valueByUserEnergy[user] = valueByUserEnergy[user] || {};
		valueByUserEnergy[user][data[r].energy] = data[r][lang.fee];
	}

	var datasets = userOrder.map(function (user) {
		return {
			label: user,
			data: energyOrder.map(function (energy) {
				return (valueByUserEnergy[user] && valueByUserEnergy[user][energy]) || 0;
			}),
			backgroundColor: user == lang.youcall ? "orange" : "green"
		};
	});

	var canvas = newCanvas("#graphEnergy", wid, hei);
	var chart = new Chart(canvas, {
		type: "bar",
		data: { labels: energyOrder, datasets: datasets },
		options: {
			responsive: false,
			maintainAspectRatio: false,
			animation: { duration: 1000 },
			scales: {
				x: { ticks: { font: { size: wid < 480 ? 12 : 15 } } },
				y: {
					title: {
						display: true,
						text: lang.fee + "（" + lang.priceunit + "/" + lang.monthunit + "）"
					},
					ticks: { font: { size: 12 } }
				}
			},
			plugins: {
				legend: { position: "top", labels: { font: { size: 12 } } },
				datalabels: {
					color: "#000",
					font: { size: 10, family: "sans-serif" },
					anchor: "end",
					align: "end",
					formatter: function (value) {
						return Math.round(value).toLocaleString() + lang.priceunit;
					}
				}
			}
		},
		plugins: [ChartDataLabels]
	});
}

// graphCO2average( averageData ) -----------------------------------------------------
//		energy compare to average
function graphCO2average(averageData) {
	graphCO2averageCommon(averageData, "graphCO2average");
}

// graphCO2averageCommon( averageData, target ) -----------------------------------------------------
function graphCO2averageCommon(averageData, target) {
	if (!$("#" + target).is(":visible")) {
		return;
	}

	$("#" + target).html("");

	wid =
		Math.min(
			$("#" + target)
				.parent()
				.width(),
			$(window).width()
		) * 0.9;
	if (wid <= 0) return;
	hei = Math.max(wid * 0.4, 320);

	var data = [
		{ user: lang.average, CO2: Math.round(averageData.co2[1].total * 12) },
		{ user: lang.youcall, CO2: Math.round(averageData.co2[0].total * 12) }
	];

	var categoryOrder = [lang.youcall, lang.average];
	var valueByUser = {};
	for (var r in data) {
		valueByUser[data[r].user] = data[r].CO2;
	}
	var colorByUser = {};
	colorByUser[lang.youcall] = "red";
	colorByUser[lang.average] = "green";

	var canvas = newCanvas("#" + target, wid, hei);
	var chart = new Chart(canvas, {
		type: "bar",
		data: {
			labels: categoryOrder,
			datasets: [
				{
					label: "CO2",
					data: categoryOrder.map(function (user) {
						return valueByUser[user] || 0;
					}),
					backgroundColor: categoryOrder.map(function (user) {
						return colorByUser[user];
					})
				}
			]
		},
		options: {
			responsive: false,
			maintainAspectRatio: false,
			animation: { duration: 1000 },
			scales: {
				x: { ticks: { font: { size: 15 } } },
				y: {
					title: { display: true, text: lang.co2emission + "（kg/" + lang.yearunit + "）" },
					ticks: { font: { size: 12 } }
				}
			},
			plugins: {
				legend: { display: false },
				datalabels: {
					color: "#000",
					font: { size: 12, family: "sans-serif" },
					anchor: "end",
					align: "end",
					formatter: function (value) {
						return Math.round(value).toLocaleString() + "kg";
					}
				}
			}
		},
		plugins: [ChartDataLabels]
	});
}

// graphMonthly( ret ) -----------------------------------------------------
//		monthly graph xAxis are from Jan. to Dec. #graphMonthly
//
// parameters
//		ret : graph data calcurated by D6
//
function graphMonthly(ret) {
	if (!$("#graphMonthly").is(":visible")) {
		return;
	}
	//graph captions
	var titles = {
		kg: lang.co2emission + "（" + lang.co2unitpermonth + "）",
		MJ: lang.primaryenergy + "（" + lang.energyunitpermonth + "）",
		yen: lang.fee + "（" + lang.feeunitpermonth + "）"
	};
	var enename = {
		electricity: lang.electricitytitle,
		gas: lang.gastitle,
		kerosene: lang.kerosenetitle,
		coal: lang.briquettitle,
		hotwater: lang.areatitle,
		car: lang.gasolinetitle
	};
	var color = {
		electricity: "orange",
		gas: "Lime",
		kerosene: "red",
		coal: "black",
		hotwater: "yellow",
		car: "magenta"
	};
	var captionGraph = lang.monthlytitle;
	var captionMonth = lang.month;
	var captionEnergy = "energyname"; //same to disp.js
	$("#graphMonthly").html("<h3>" + captionGraph + "</h3>");

	wid =
		Math.min(
			$("#graphMonthly")
				.parent()
				.width(),
			$(window).width()
		) * 0.9;
	if (wid <= 0) return;
	hei = Math.max(wid * 0.4, 320);

	// redesign data for graph
	for (var c in ret.data) {
		ret.data[c][captionMonth] = ret.data[c].month;
		delete ret.data[c].month;
		ret.data[c][captionEnergy] = enename[ret.data[c].energyname];
		delete ret.data[c].energy;
		ret.data[c][titles[ret.yaxis]] = ret.data[c][ret.yaxis];
		delete ret.data[c][ret.yaxis];
	}
	var valueKey = titles[ret.yaxis];

	var colorByLabel = {};
	for (var key in enename) {
		colorByLabel[enename[key]] = color[key];
	}

	var monthLabels = [];
	var valueByEnergyMonth = {};
	for (var r in ret.data) {
		var month = ret.data[r][captionMonth];
		var energyLabel = ret.data[r][captionEnergy];
		if (monthLabels.indexOf(month) === -1) monthLabels.push(month);
		valueByEnergyMonth[energyLabel] = valueByEnergyMonth[energyLabel] || {};
		valueByEnergyMonth[energyLabel][month] = ret.data[r][valueKey];
	}

	var energyOrder = [];
	for (var key2 in enename) {
		if (valueByEnergyMonth[enename[key2]]) energyOrder.push(enename[key2]);
	}

	var datasets = energyOrder.map(function (label) {
		return {
			label: label,
			data: monthLabels.map(function (month) {
				return (valueByEnergyMonth[label] && valueByEnergyMonth[label][month]) || 0;
			}),
			backgroundColor: colorByLabel[label]
		};
	});

	var canvas = newCanvas("#graphMonthly", wid, hei);
	var chart = new Chart(canvas, {
		type: "bar",
		data: { labels: monthLabels, datasets: datasets },
		options: {
			responsive: false,
			maintainAspectRatio: false,
			animation: false,
			scales: {
				x: { stacked: true, ticks: { font: { size: 13 } } },
				y: {
					stacked: true,
					title: { display: true, text: valueKey },
					ticks: { font: { size: 12 } }
				}
			},
			plugins: {
				legend: { position: "right", labels: { font: { size: 12 } } },
				datalabels: { display: false }
			}
		},
		plugins: [ChartDataLabels]
	});
}

// graphDemand( ret ) --------------------------------------
//		2 type of demand curve graph, loggeddata and sumup one.
//
// parameters
//		ret : graph data calcrated by D6
//
function graphDemand(ret) {
	//graph captions
	var captionGraph = "1時間ごとデマンドグラフ（積み上げ）";
	var captionHour = "時刻";
	var captionEquipment = "機器";
	var caption_kW = "消費電力(kW)";

	var captionInputTable = "1時間ごとデマンドグラフ（計測）";
	$("#graphDemandSumup").html("<h3>" + captionGraph + "</h3>");
	$("#graphDemandLog").html("<h3>" + captionInputTable + "</h3>");

	wid = Math.min(500, $(window).width()) * 0.9;
	hei = wid * 0.9;

	var colorByEquip = {};
	for (var cid in ret.clist) {
		colorByEquip[ret.clist[cid].title] = ret.clist[cid].color;
	}

	function buildDemandChart(containerSelector, rows) {
		// redesign data for graph
		for (var c in rows) {
			rows[c][captionHour] = rows[c].time;
			delete rows[c].time;
			rows[c][captionEquipment] = rows[c].equip;
			delete rows[c].equip;
			rows[c][caption_kW] = rows[c].electricity_kW;
			delete rows[c][rows.electricity_kW];
		}

		var hourLabels = [];
		var equipOrder = [];
		var valueByEquipHour = {};
		for (var r in rows) {
			var hour = rows[r][captionHour];
			var equip = rows[r][captionEquipment];
			if (hourLabels.indexOf(hour) === -1) hourLabels.push(hour);
			if (equipOrder.indexOf(equip) === -1) equipOrder.push(equip);
			valueByEquipHour[equip] = valueByEquipHour[equip] || {};
			valueByEquipHour[equip][hour] = rows[r][caption_kW];
		}

		var datasets = equipOrder.map(function (equip) {
			return {
				label: equip,
				data: hourLabels.map(function (hour) {
					return (valueByEquipHour[equip] && valueByEquipHour[equip][hour]) || 0;
				}),
				backgroundColor: colorByEquip[equip]
			};
		});

		var canvas = newCanvas(containerSelector, wid, hei);
		return new Chart(canvas, {
			type: "bar",
			data: { labels: hourLabels, datasets: datasets },
			options: {
				responsive: false,
				maintainAspectRatio: false,
				animation: { duration: 2000 },
				scales: {
					x: { stacked: true, ticks: { font: { size: 13 } } },
					y: {
						stacked: true,
						title: { display: true, text: caption_kW },
						ticks: { font: { size: 15 } }
					}
				},
				plugins: {
					legend: { display: equipOrder.length > 0 },
					datalabels: { display: false }
				}
			},
			plugins: [ChartDataLabels]
		});
	}

	buildDemandChart("#graphDemandSumup", ret.sumup);
	buildDemandChart("#graphDemandLog", ret.log);
}
