// 平均値やCO2など
//

var co2 = {
	person : 3,
	prefcode : 26, 

	//評価対象項目の一覧
	co2unit : {
		"elect" :0.545,		//東北電力2016年実排出（仮）　→DBから読み込んで設定する
		"nagas" :2.23,
		"lpgas" :5.98,
		"water" :0.50,
		"keros" :2.49,
		"gasol" :2.32,
		"light" :2.58,
		"waste" :0.26,		//10L 1袋
		"solar" :-0.545,		//  電力はこの値は使われずに、以下の電力会社別が使われる
	},

	//電力会社別　汎用
	eleco2unit : [ 	//2016年値調整前
		0.486	//common
		,	0.632	//1北海道
		,	0.545	//東北
		,	0.486	//東京
		,	0.486	//中部
		,	0.640	//北陸
		,	0.509	//6関西
		,	0.691	//中国
		,	0.510	//四国
		,	0.462	//九州
		,	0.799	//10沖縄
		,	0.512
		,	0.182
		,	0.512
		,	0.512
		,	0.512
	],


	//平均値としてアクセスする変数（ この数値は仮　）
	//
	average : {
		"elect" :500,
		"nagas" :20,
		"lpgas" :6,
		"water" :15,
		"keros" :10,
		"gasol" :30,
		"light" :0,
		"waste" :10,
		"co2" :10		// CO2は計算して示す
	},

	//　月別の消費量　全国値　エネルギー経済統計要覧(2008年値）より、家計調査支出の重み付けで月割り
	//　※都市ガスとプロパン、ガソリンと軽油はいずれかを採用
	//  一般廃棄物処理事業実態調査　2016年度　925g　×　4317÷3018（家庭ごみ比率）
	cons : {
		"elect" :[ 0, 521,	470.3,	416,	363.8,	323.6,	317.6,	390.7,	435.3,	381.3,	337.8,	392.1,	475.1 ],
		"nagas" :[ 0, 26.1,	25.2,	23.5,	22,	19.8,	17.2,	15.1,	13.8,	14.6,	17.1,	21.1,	24.2 ],
		"lpgas" :[ 0,	11.7,	11.3,	10.5,	9.9,	8.9,	7.7,	6.8,	6.2,	6.6,	7.7,	9.4,	10.8 ],
		"water" :[ 0,	25.1,	24.8,	23.3,	22.9,	26.9,	24,	24.8,	26,	29.8,	23.4,	26.6,	24.3 ],
		"keros" :[ 0, 32,	29.8,	21.4,	12.4,	7.4,	6.8,	5.1,	4.3,	4.3,	10,	18.7,	32.8 ],
		"gasol" :[ 0, 31.1,	31,	34.3,	36.1,	38.3,	35.4,	38.2,	42.1,	36.8,	34.4,	34.7,	36.9 ],
		"light" :[ 0, 27.5,	27.5,	30.4,	31.9,	33.9,	31.3,	33.8,	37.3,	32.5,	30.4,	30.7,	32.7 ],
		"waste" :[ 0, 13.1,	13.1,	13.1,	13.1,	13.1,	13.1,	13.1,	13.1,	13.1,	13.1,	13.1,	13.1 ]
	},
	
	//　世帯人数別の消費量比率 M社省エネ家計簿実績値より
	num_coefficient : {
			"elect" :[ 1,	0.58,	0.85,	1.01,	1.08,	1.27,	1.56 ],
			"nagas" :[  1,	0.62,	0.75,	1.04,	1.14,	1.29,	1.40],
			"lpgas" :[  1,	0.62,	0.75,	1.04,	1.14,	1.29,	1.40],
			"water" :[  1,	0.62,	0.83,	1.00,	1.02,	1.22,	1.55],
			"keros" :[  1,	0.17,	0.65,	0.89,	1.02,	1.45,	1.91],
			"gasol" :[  1,	0.86,	0.88,	1.07,	1.16,	1.20,	1.24],
			"light" :[  1,	0.86,	0.88,	1.07,	1.16,	1.20,	1.24],
			"waste" :[  1,	0.33,	0.67,	1.00,	1.33,	1.66,	2.00]
		},
	
		//都道府県比率
		// 1北海道・・・・47沖縄  / 無変換・ 電気・ガス・灯油・ガソリン　
	
	pref_cons2row : {
			"elect" :1,
			"nagas" :2,
			"lpgas" :2,
			"water" :0,
			"keros" :3,
			"gasol" :4,
			"light" :4,
			"waste" :0 
		},
	
	pref_coefficient : [
			[ 1, 1, 1, 1, 1 ],
			[ 1, 0.84, 0.9, 3.12, 0.9 ],
			[ 1, 0.96, 0.66, 3.98, 0.88 ],
			[ 1, 0.87, 0.88, 2.58, 0.87 ],
			[ 1, 0.85, 1.27, 1.16, 0.87 ],
			[ 1, 0.9, 0.77, 3.27, 1.1 ],
			[ 1, 0.94, 1.07, 2.32, 1.09 ],
			[ 1, 0.94, 1.09, 1.52, 1.08 ],
			[ 1, 0.95, 1.16, 0.88, 1.33 ],
			[ 1, 0.96, 1.08, 0.84, 1.24 ],
			[ 1, 0.88, 0.96, 0.73, 1.22 ],
			[ 1, 0.92, 1.08, 0.28, 0.6 ],
			[ 1, 0.89, 1, 0.31, 0.71 ],
			[ 1, 1.01, 1.14, 0.19, 0.32 ],		//13本来の東京都
			[ 1, 1.02, 1.25, 0.32, 0.64 ],
			[ 1, 0.93, 1.16, 0.99, 1.05 ],
			[ 1, 1.15, 0.97, 2.1, 1.39 ],
			[ 1, 1.14, 1.09, 1.46, 1.22 ],
			[ 1, 1.21, 1.1, 1.19, 1.1 ],
			[ 1, 0.964, 0.878, 1.038, 1.149 ],	//19山梨
			[ 1, 0.92, 0.95, 1.55, 1.22 ],
			[ 1, 1.07, 1.18, 0.66, 1.05 ],
			[ 1, 0.95, 1.3, 0.42, 0.83 ],
			[ 1, 0.95, 1.11, 0.36, 0.72 ],
			[ 1, 1.02, 1.07, 0.66, 1.23 ],
			[ 1, 0.96, 0.96, 0.53, 0.96 ],
			[ 1, 1.01, 1.14, 0.33, 0.51 ],
			[ 1, 1.05, 1.13, 0.15, 0.32 ],
			[ 1, 0.95, 1.06, 0.23, 0.61 ],
			[ 1, 1.01, 1.19, 0.41, 0.78 ],
			[ 1, 1.09, 0.8, 0.63, 0.81 ],
			[ 1, 0.95, 0.88, 1.01, 1.02 ],
			[ 1, 0.98, 1.03, 0.72, 1.17 ],
			[ 1, 1.06, 1.05, 0.72, 0.97 ],
			[ 1, 1.03, 1.15, 0.57, 0.94 ],
			[ 1, 0.95, 1.01, 0.81, 1.52 ],
			[ 1, 1.32, 0.98, 0.79, 1.08 ],
			[ 1, 1.1, 0.91, 0.57, 1.02 ],
			[ 1, 1.11, 1.02, 0.61, 0.95 ],
			[ 1, 1.01, 1.1, 0.4, 0.97 ],
			[ 1, 0.89, 1.11, 0.37, 0.77 ],
			[ 1, 0.88, 0.98, 0.65, 1.01 ],
			[ 1, 0.88, 1.2, 0.46, 0.67 ],
			[ 1, 0.9, 0.97, 0.47, 0.86 ],
			[ 1, 0.91, 0.99, 0.54, 1.24 ],
			[ 1, 0.89, 0.9, 0.42, 1.1 ],
			[ 1, 0.87, 1.09, 0.36, 1.17 ],
			[ 1, 0.91, 0.78, 0.25, 0.68 ] 
	],
	
	
		// 都市部・郊外別の消費比率（郊外の場合の割り増し率）
	urban_coefficient : {
			"elect" :1.10,
			"nagas" :0.84,
			"lpgas" :0.84,
			"water" :1.00,
			"keros" :2.29,
			"gasol" :1.82,
			"light" :1.82,
			"waste" :1.00 
	},
	
	//　5段階評価のしきい値
	//
	rank_threshold : {
			"elect" :[ 0.7, 0.9, 1.2, 1.5 ],
			"nagas" :[ 0.7, 0.9, 1.2, 1.5 ],
			"lpgas" :[ 0.7, 0.9, 1.2, 1.5 ],
			"water" :[ 0.7, 0.9, 1.2, 1.5 ],
			"keros" :[ 0.6, 0.9, 1.5, 3 ],
			"gasol" :[ 0.6, 0.9, 1.5, 3 ],
			"light" :[ 0.6, 0.9, 1.5, 3 ],
			"waste" :[ 0.7, 0.9, 1.2, 1.5 ],
			"co2" :[ 0.7, 0.9, 1.2, 1.5 ]
	},
	rank_message: [
		"評価なし",
		"多い",
		"やや多い",
		"ふつう",
		"やや少ない",
		"少ない",
		"発電あり"
	],
	
	
	//　増減のしきい値
	//
	rank_updown_threshold : [
		0.9, 0.97, 1.05, 1.2
	],
	rank_updown_message: [
		"評価なし",
		"増えすぎ",
		"やや増加",
		"前年なみ",
		"やや削減",
		"大きく削減",
		""
	],

	cunit: { "elect": "kWh", "nagas": "m3", "lpgas": "m3", "water": "m3", "keros": "L", "gasol": "L", "light": "L", "solar": "kWh" },
	ccolor: { "elect": "rgb(255, 184, 0)", "nagas": "rgb(34, 197, 94)", "lpgas": "rgb(22, 163, 74)", "water": "rgb(14, 165, 233)", "keros": "rgb(248, 113, 113)", "gasol": "rgb(234, 179, 8)", "light": "rgb(168, 85, 247)", "solar": "rgb(16, 185, 129)" },

		
		//季節のあいさつ
	get_season_comment : function() {
			comments = [
				"",
				"寒い日が続きますが、暖かく過ごす工夫でのりきっていきましょう。",
				"寒い日が続きますが、風邪などひかないように、工夫で省エネをしていきましょう。",
				"少しずつ暖かい日も出てきました。暖房の使い方も少し控えめにしてみてはどうでしょう。",
				"暖かい日が増えています。いつ暖房をしまうか準備しましょう。",
				"さわやかな晴れの日が多くなっています。外に出て楽しんでみましょう。",
				"風通しが悪いと、カビが生えることもありますので、特に晴れた日は乾燥に心がけてみて下さい。",
				"暑さが本格化してきます。すだれやよしずで日射を防ぐなど、気を付けてみてください。",
				"暑い日中はお休みするのが一番です。熱中症にならないように水分補給には気を付けてください。",
				"少し涼しくなってきました。季節の変わり目で風邪などひかないようにしてください。",
				"秋の味覚だけでなく、ハイキングなども楽しい季節です。自然の中にでかけてみましょう。",
				"徐々に寒い日も出てきます。暖かく過ごす準備をはじめてみませんか。",
				"家の隙間がないか、厚手のカーテンがあるか、冬の準備が大切な時期です。",
				"寒い日がありますが、風邪などひかずに元気に乗り切っていきましょう。",
			];
			var date = new Date();
			return comments[date.getMonth()+1];
	},

	get_average : function( month,person,prefcode ){
		var ret = {};
		var co2 = 0;
		for( var k in this.pref_cons2row ){	
			//solarは含めない
			var energy = ( this.cons[k][month] ? this.cons[k][month] : 0 ) 
				* this.pref_coefficient[prefcode][this.pref_cons2row[k]] 
				* this.num_coefficient[k][Math.min(6,person)];
			co2 += energy * this.co2unit[k];
			ret[k] = energy;
		}
		ret.co2 = co2;
		return ret;
	},

	get_average_compare: function( me, month,person,prefcode ){
		var ret = {};
		ret.comment = {};
		ret.rank = {};
		var av = this.get_average(month,person,prefcode);
		ret.cons = av;
		for( var k in av ){
			if( !me[k] && me[k]!="0" ) {
				ret.comment[k] = "";
				ret.rank[k] = 0;
			} else {
				ret.comment[k] = Math.round(parseFloat(me[k]) / av[k] * 10)/10 + "倍";
				var rate = parseFloat(me[k]) / av[k];
				ret.rate = rate;
				if( rate > this.rank_threshold[k][3]){
					ret.rank[k] = 1;
				} else if ( rate > this.rank_threshold[k][2]){
					ret.rank[k] = 2;
				} else if ( rate > this.rank_threshold[k][1]){
					ret.rank[k] = 3;
				} else if ( rate > this.rank_threshold[k][0]){
					ret.rank[k] = 4;
				} else {
					ret.rank[k] = 5;
				}
			}
		}
		//solar追加
		ret.comment["solar"] = "";
		ret.rank["solar"] = me["solar"] ? 6 : 0;
		return ret;
	},

	calc_co2 : function( energy ){
		var co2 = 0;
		for( var k in this.co2unit ){
			if( energy[k] ){
				co2 += parseFloat(energy[k]) * this.co2unit[k];
			}
		}
		co2 = Math.round( co2 *10 ) / 10;
		return co2;
	},

	get_reduce_compare: function( me, ly ){
		var ret = {};
		ret.comment = {};
		ret.rank = {};
		ret.cons = ly;

		for( var k in this.average ){
			//co2を含む
			if( (!me[k] && me[k]!==0) || (!ly[k] && ly[k]!==0) ) {
				ret.comment[k] = "";
				ret.rank[k] = 0;
			} else {
				var me1 = parseFloat(me[k]);
				var ly1 = parseFloat(ly[k]);
				if( ly1 == 0 ){
					if ( me1 == 0 ){
						ret.comment[k] = "";
						ret.rank[k] = 0;
					} else {
						ret.comment[k] = "増加";
						ret.rank[k] = 1;
					}
				} else {
					var rate = me1 / ly1;	
					if( me1 > ly1 ){
						ret.comment[k] = Math.round((me1-ly1)/ly1 * 1000)/10 + "% 増";
					} else {
						ret.comment[k] = Math.round(-(me1-ly1)/ly1 * 1000)/10 + "% 減";
					}
					if( rate > this.rank_updown_threshold[3]){
						ret.rank[k] = 1;
					} else if ( rate > this.rank_updown_threshold[2]){
						ret.rank[k] = 2;
					} else if ( rate > this.rank_updown_threshold[1]){
						ret.rank[k] = 3;
					} else if ( rate > this.rank_updown_threshold[0]){
						ret.rank[k] = 4;
					} else {
						ret.rank[k] = 5;
					}
				}
			}
		}	
		//solar追加
		ret.comment["solar"] = "";
		ret.rank["solar"] = me["solar"] ? 6 : 0;
		return ret;
	},

}

