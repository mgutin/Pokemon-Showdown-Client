var gen = 100, genWasChanged, notation, pokedex, setdex, typeChart, moves;
var abilities, items, STATS, calcHP, calcStat, calculateAllMoves, damageResults;
var resultLocations = [[], []];

function calculate(room, pokemonDefender, moveName, notActivePokemon) {
	// getAction();
	if (room === "" || pokemonDefender === "")
		return null;
	room = jQuery.extend(true, {}, room);
	pokemonDefender = jQuery.extend(true, {}, pokemonDefender);
	if(notActivePokemon !== undefined)
		notActivePokemon = jQuery.extend(true, {}, notActivePokemon);

	var allPokemon = room.myPokemon;
	if(notActivePokemon){
		for(var i = 0; i<room.myPokemon.length; i++)
			if(room.myPokemon[i].searchid === notActivePokemon.searchid)
				notActivePokemon = jQuery.extend(true, {}, room.myPokemon[i]);
	}
	var pokemonAttacker = notActivePokemon;
	if (notActivePokemon === undefined)
		for (var i = 0; i < allPokemon.length; i++)
			if (allPokemon[i].active) {
				pokemonAttacker = allPokemon[i];
				break;
			}
	var field = getField();
	//your pokemon
	pokemonAttacker.boosts = {};
	var attacker = room.battle.p2, defender = room.battle.p1;//room.battle.p2.id === pokemonDefender.id ? room.battle.p1 : room.battle.p2;
	if(attacker.id === pokemonDefender.id){
		attacker = room.battle.p1;
		defender = room.battle.p2;
	}
	if(attacker.active[0] !== null && attacker.active[0].boosts !== undefined)
		pokemonAttacker.boosts = attacker.active[0].boosts;
	this.attacker = new POKEMONValue(pokemonAttacker);
	//opponent pokemon
	pokemonDefender.boosts = {};
	if(defender.active[0] !== null && defender.active[0].boosts !== undefined)
		pokemonDefender.boosts = defender.active[0].boosts;
	this.defender = new POKEMONValue(pokemonDefender.active[0]);
	var damage = calculateDamage(this.attacker, this.defender, field);
	var d = 0;
	var ar = damage[1];
	if (moveName === undefined) {
		for (var i = 0; i < ar.length; i++) {
			var defenderHp = this.attacker.maxHP*this.attacker.hp/100;
			var dam = ar[i].damageText.replace(/ (.*)/, "").split("-");
			var d1 = Math.round(dam[0]/defenderHp*100), d2 = Math.round(dam[1]/defenderHp*100);
			ar[i].d1 = d1;
			ar[i].d2 = d2;
			var moves = this.defender.moves;
			if (moves.length === 0)
				moves = this.defender.set[Object.keys(this.defender.set)[0]].moves;
			ar[i].moveName = moves[i];
		}
		return ar;
	}
	ar = damage[0];
	//TODO fix double battles
	//TODO megas on both sides
	//TODO tell which pokemon from entire party is best tank a hit high atk/spatk
	//TODO change defenders moves, abilities, ect when it becomes available
	//TODO ranges for z-powers
	//TODO worst case scenario to best case scenario??
	//TODO cache the ranges so it doesn't have to calculate it for each move since it does all moves at once anyways
	//TODO display recoil
	for (var i = 0; i < ar.length; i++)
		if (ar[i].description.includes(moveName)) {
			var defenderHp = this.defender.maxHP*this.defender.hp/100;
			var dam = ar[i].damageText.replace(/ (.*)/, "").split("-");
			var d1 = Math.round(dam[0]/defenderHp*100), d2 = Math.round(dam[1]/defenderHp*100);
			d = " (" + d1 + "% - " + d2 + "%" + ")";
			if (d1 > 200 && d2 > 200)
				d = "(OHKO)";
			break;
		}
	if (d === 0)
		return "";
	return d;
}
function getField() {
	this.speedBoost = -1;
	var field = new Field();
	//p1 is opponent
	var sideConditionsO = room.battle.p1.sideConditions;
	if (sideConditionsO["reflect"] !== undefined)//lightscreen
		field.isReflect = [field.isReflect[0],true];
	if (sideConditionsO["lightscreen"] !== undefined)
		field.isReflect = [field.isReflect[0],true];
	if (sideConditionsO["tailwind"] !== undefined)
		this.speedBoost = 1;
	var sideConditionsY = room.battle.p2.sideConditions;
	if (sideConditionsY["reflect"] !== undefined)
		field.isReflect = [true,field.isReflect[1]];
	if (sideConditionsY["tailwind"] !== undefined)
		this.speedBoost = 0;
	if (sideConditionsY["lightscreen"] !== undefined)
		field.isReflect = [true,field.isReflect[1]];

	//TODO weather, Sun, Harsh Sunshine, Hail
	field.weather = weather(room.battle.weather);
	// if (room.battle.weather.includes("rain"))
	// 	field.weather = ['Rain'];
	// if (room.battle.weather.includes("sand"))
	// 	field.weather = ['Sand'];
	//TODO terain, field.terrain = "Grassy"
	var psuedoWeather = room.battle.pseudoWeather;
	var isTrickRoom = false;
	for(var i = 0; i<psuedoWeather.length; i++)
		if(psuedoWeather[i][0] === "Trick Room")
			isTrickRoom = true;
	field.isTrickRoom = true;
	return field;
}

function weather(weatherValue) {
	var weatherTable = {
		sunnyday: {
			name: 'Sun',
			startMessage: 'The sunlight turned harsh!',
			abilityMessage: "'s Drought intensified the sun's rays!",
			//upkeepMessage: 'The sunlight is strong!',
			endMessage: "The sunlight faded." },

		desolateland: {
			name: "Harsh Sunshine",
			startMessage: "The sunlight turned extremely harsh!",
			endMessage: "The harsh sunlight faded." },

		raindance: {
			name: 'Rain',
			startMessage: 'It started to rain!',
			abilityMessage: "'s Drizzle made it rain!",
			//upkeepMessage: 'Rain continues to fall!',
			endMessage: 'The rain stopped.' },

		primordialsea: {
			name: "Heavy Rain",
			startMessage: "A heavy rain began to fall!",
			endMessage: "The heavy rain has lifted!" },

		sandstorm: {
			name: 'Sandstorm',
			startMessage: 'A sandstorm kicked up!',
			abilityMessage: "'s Sand Stream whipped up a sandstorm!",
			upkeepMessage: 'The sandstorm is raging.',
			endMessage: 'The sandstorm subsided.' },

		hail: {
			name: 'Hail',
			startMessage: 'It started to hail!',
			abilityMessage: "'s Snow Warning whipped up a hailstorm!",
			upkeepMessage: 'The hail is crashing down.',
			endMessage: 'The hail stopped.' },

		deltastream: {
			name: 'Strong Winds',
			startMessage: 'Mysterious strong winds are protecting Flying-type Pok&eacute;mon!',
			endMessage: 'The mysterious strong winds have dissipated!' } };
	if(weatherTable[weatherValue]===undefined)
		return "";
	return weatherTable[weatherValue].name;
}

function getWarnMessage(room, pokemonDefender, notActivePokemon) {
	var best = "", maxDamage = 0;
	try {
		var damages = calculate(room, pokemonDefender, undefined, notActivePokemon);
		var OHKO = "OHKO (";
		for (var i = 0; i < damages.length; i++) {
			if (damages[i].d2 > maxDamage){
				var des = damages[i].moveName;
				best = des+"("+damages[i].d1+"%-"+damages[i].d2+"%)";
				maxDamage = damages[i].d2;
				if (damages[i].d1 > 200 && damages[i].d2 > 200) {
					var a = OHKO === "OHKO (" ? "" : ",";
					OHKO = OHKO + a + des;
				}
			}
		}
		OHKO+=")";
		if (OHKO !== "OHKO ()")
			best = OHKO;
	}catch (err){
		console.error(err);
	}
	if(maxDamage === 0)
		return "";
	return "opponent: "+best;
}
function POKEMONValue(pMon) {
	pMon = jQuery.extend(true, {}, pMon);
	setGeneration(gen);
	var isYourMon = pMon.stats !== undefined && pMon.stats.atk !== undefined && pMon.condition !== "0 fnt";
	// var isMega = !!($('input[name=megaevo]')[0] || '').checked;
	var isMega = pMon.item.endsWith("tite"); //I'll just assume you won't wait to perform mega evolution
	this.mon = pMon;
	this.name = pMon.baseSpecies === undefined ? pMon.species : pMon.baseSpecies;
	if(this.name === "Meowstic")
		this.name+="-"+pMon.gender;
	if(this.name === "Aegislash")
		this.name+="-Blade";
	if(pMon.species !== undefined && pMon.species.includes("-Mega"))
		this.name = pMon.species;
	if(isYourMon && isMega && !this.name.includes("Mega"))
		this.name += "-Mega";
	this.set = setdex[this.name];
	this.pokemon = pokedex[this.name];
	if (this.pokemon === undefined) {
		if (pokedex[pMon.name] !== undefined) {
			this.pokemon = pokedex[pMon.name];
			this.name = pMon.name;
			this.set = setdex[this.name];
		}else if (pMon.species.includes("-")) {
			var name = pMon.species.replace(/-.*/,"");
			this.pokemon = pokedex[name];
			this.name = name;
			this.set = setdex[name];
		}
	}
	this.gravity = false;
	this.ability = Tools.getAbility(pMon.ability).name;
	this.abilities = pMon.abilities;
	this.item = pMon.item;
	this.gender = pMon.gender;
	this.level = pMon.level;
	this.hp = pMon.hp;
	if(pMon.moveTrack !== undefined) {
		var moveTrack = pMon.moveTrack;
		var m = [];
		for (var i = 0; i < moveTrack.length; i++)
			m.push(moveTrack[i][0]);
	}
	this.moves = pMon.moves === undefined || pMon.moves.length === 0 ? m : pMon.moves;

	//only do moves that aren't disabled
	if(isYourMon && pMon.active && room.request.active){
		var v = room.request.active[0].moves;
		var mdsjklf = [];
		for(var i = 0; i<v.length; i++)
			if(!v[i].disabled)
				mdsjklf.push(v[i].id);
		this.moves = mdsjklf;
	}

	this.stats = pMon.stats;
	this.boosts = pMon.boosts;
	if(this.name === "Ditto") {
		var v = pMon.volatiles;
		if (v !== undefined && v.transform !== undefined && v.transform[2] !== undefined) {
			var tMon = v.transform[2];
			this.mon.types = tMon.types;
			var hp = this.mon.baseStats.hp;
			this.mon.baseStats = tMon.baseStats;
			this.mon.baseStats.hp = hp;
		}
	}
	function fixStats(stats) {
		if(!stats.length)
			return {};
		for (var key in stats) {
			if (key === "spd")//spd is not speed it's special defense
				stats["sd"] = stats[key];
			else if (key === "def")
				stats["df"] = stats[key];
			else if (key === "spa")
				stats["sa"] = stats[key];
			else
				stats[key.substr(0, 2)] = stats[key];
			//then remove key
			delete stats[key];
		}
	}

	this.oldBoosts = this.boosts;
	if (this.boosts !== undefined)
		this.boosts = fixStats(this.oldBoosts);
	this.getPossibleAbilities = function () {
		if (this.ability !== undefined || this.ability !== "")
			return [this.ability];
		if (this.abilities !== undefined || this.abilities !== [])
			return abilities;
		var abilities = [];
		for (var i = 0; i < this.set.size(); i++)
			abilities.push(this.set["ability"]);
		return abilities;
	};

	this.getPossibleItems = function () {
		if (this.item !== undefined || this.item === "")
			return [this.item];
		var items = [];
		for (var i = 0; i < this.set.size(); i++)
			items.push(this.set["item"]);
		return items;
	};
	this.isGrounded = function () {
		return this.gravity ||
			this.pokemon["t1"] !== "Flying" &&
			this.pokemon["t2"] !== "Flying" &&
			this.getPossibleAbilities().indexOf("Levitate") === -1 &&
			this.getPossibleAbilities().indexOf("levitate") === -1;
	};

	// var setName = pokeInfo.substring(pokeInfo.indexOf("(") + 1, pokeInfo.lastIndexOf(")"));
	var types = [this.pokemon.t1,this.pokemon.t2];
	//TODO not sure when to use this vs above like plated arceus or something???
	// if(pMon.types !== undefined)
	// 	types = pMon.types;
	this.type1 = types[0];
	this.type2 = (types[1] && types[1] !== "undefined") ? types[1] : "";
	this.rawStats = pMon.stats ? fixStats(pMon.stats) : [];
	this.stats = pMon.stats ? fixStats(pMon.stats) : [];
	this.evs = [];
	try {
		this.curSet = this.set[Object.keys(this.set)[0]];
	}catch (err){
		//console.error("No setdex for: "+this.name);
		this.curSet = {
			ability: this.ability===undefined?this.abilities[0]:this.ability,
			evs: {sd: 192, df: 128, hp: 188},
			item: "Leftovers",
			ivs: {},
			level: 100,
			moves: ["Blizzard", "Giga Drain", "Ice Shard", "Protect"],
			nature: "Hardy"
		};
	}

	this.HPEVs = (this.curSet.evs && typeof this.curSet.evs.hp !== "undefined") ? this.curSet.evs.hp : 0;
	if (gen < 3) {
		var HPDVs = 15;
		this.maxHP = ~~(((this.pokemon.bs.hp + HPDVs) * 2 + 63) * this.level / 100) + this.level + 10;
	} else if (this.pokemon.bs.hp === 1) {
		this.maxHP = 1;
	} else {
		var HPIVs = 31;
		this.maxHP = ~~((this.pokemon.bs.hp * 2 + HPIVs + ~~(this.HPEVs / 4)) * this.level / 100) + this.level + 10;
	}
	if(pMon.stats === undefined || pMon.stats.length > 0)
		this.curHP = this.maxHP*pMon.hp/(pMon.maxHP === undefined ? pMon.maxhp : pMon.maxhp);
	else {
		this.curHP = this.hp;
		this.hp = this.curHP/this.maxHP*100;//needs to be a percent
	}
	this.nature = this.curSet.nature;
	for (var i = 0; i < STATS.length; i++) {
		var stat = STATS[i];
		if (this.boosts[stat] == undefined)
			this.boosts[stat] = 0;
		this.evs[stat] = (this.curSet.evs && typeof this.curSet.evs[stat] !== "undefined") ? this.curSet.evs[stat] : 0;
		if (gen < 3) {
			var dvs = 15;
			this.rawStats[stat] = ~~(((this.pokemon.bs[stat] + dvs) * 2 + 63) * this.level / 100) + 5;
		} else {
			var ivs = (this.curSet.ivs && typeof this.curSet.ivs[stat] !== "undefined") ? this.curSet.ivs[stat] : 31;
			var natureMods = NATURES[this.nature];
			var nature = natureMods[0] === stat ? 1.1 : natureMods[1] === stat ? 0.9 : 1;
			this.rawStats[stat] = ~~((~~((this.pokemon.bs[stat] * 2 + ivs + ~~(this.evs[stat] / 4)) * this.level / 100) + 5) * nature);
		}
	}
	if(this.ability === undefined || this.ability === "")
		this.ability = (this.curSet.ability && typeof this.curSet.ability !== "undefined") ? this.curSet.ability :
			(this.pokemon.ab && typeof this.pokemon.ab !== "undefined") ? this.pokemon.ab : "";
	if(this.item === undefined || this.item === "")
		this.item = (this.curSet.item && typeof this.curSet.item !== "undefined" && (this.curSet.item === "Eviolite" || this.curSet.item.indexOf("ite") < 0)) ? this.curSet.item : "";
	this.status = statuses(pMon.status);
	this.toxicCounter = 0;
	this.mymoves = [];
	if (this.moves !== undefined && !this.item.includes("choice")) {
		var i = 0;
		while (this.moves.length < 4)
			this.moves.push(this.curSet.moves[i++]);
	}
	for (var i = 0; i < 4; i++) {
		var moveName = this.curSet.moves[i];
		if (this.moves !== undefined && this.moves.length !== 0)
			moveName = Tools.getMove(this.moves[i]).name;
		var defaultDetails = moves[moveName] || moves['(No Move)'];
		this.mymoves.push($.extend({}, defaultDetails, {
			name: (defaultDetails.bp === 0) ? "(No Move)" : moveName,
			bp: defaultDetails.bp,
			type: defaultDetails.type,
			category: defaultDetails.category,
			isCrit: !!defaultDetails.alwaysCrit,
			hits: defaultDetails.isMultiHit ? ((this.ability === "Skill Link" || this.item === "Grip Claw") ? 5 : 3) : defaultDetails.isTwoHit ? 2 : 1,
			usedTimes: defaultDetails.usedTimes ? defaultDetails.usedTimes : 1
		}));
		this.weight = this.pokemon.w;
		this.gender = this.pokemon.gender ? "genderless" : "Male";


		function calcStats(poke) {
			for (var i = 0; i < STATS.length; i++) {
				calcStat(poke, STATS[i]);
			}
		}

		function calcCurrentHP(max, percent) {
			return Math.ceil(percent * max / 100);
		}

		function calcPercentHP(max, current) {
			return Math.floor(100 * current / max);
		}

		this.hasType = function (type) {
			return this.type1 === type || this.type2 === type;
		};
	}
}
function statuses(status) {
	if (status === 'brn') {
		return "Burned";
	} else if (status === 'psn') {
		return "Poisoned"
	} else if (status === 'tox') {
		return "Badly Poisoned";
	} else if (status === 'slp') {
		return "Asleep";
	} else if (status === 'par') {
		return "Paralyzed";
	} else if (status === 'frz') {
		return "Frozen";
	}else
		return "Healthy";
}
function calculateDamage(pokemonLeft, pokemonRight, field) {
	var p1 = pokemonLeft;//new Pokemon($("#p1"));
	var p2 = pokemonRight;//new Pokemon($("#p2"));
	var battling = [p1, p2];
	var notation = "%";
	p1.maxDamages = [];
	p2.maxDamages = [];
	damageResults = calculateAllMoves(p1, p2, field);
	var fastestSide = p1.stats[SP] > p2.stats[SP] ? 0 : p1.stats[SP] === p2.stats[SP] ? "tie" : 1;
	var result, minDamage, maxDamage, minDisplay, maxDisplay;
	var highestDamage = -1;
	var bestResult;
	for (var i = 0; i < 4; i++) {
		result = damageResults[0][i];
		minDamage = result.damage[0] * p1.mymoves[i].hits;
		maxDamage = result.damage[result.damage.length - 1] * p1.mymoves[i].hits;
		p1.maxDamages.push({
			moveOrder : i,
			maxDamage : maxDamage
		});
		p1.maxDamages.sort(function (firstMove, secondMove) {
			return secondMove.maxDamage - firstMove.maxDamage;
		});
		minDisplay = notation === '%' ? Math.floor(minDamage * 1000 / p2.maxHP) / 10 : Math.floor(minDamage * 48 / p2.maxHP);
		maxDisplay = notation === '%' ? Math.floor(maxDamage * 1000 / p2.maxHP) / 10 : Math.floor(maxDamage * 48 / p2.maxHP);
		result.damageText = minDamage + "-" + maxDamage + " (" + minDisplay + " - " + maxDisplay + notation + ")";
		result.koChanceText = p1.mymoves[i].bp === 0 ? 'nice move' :
			getKOChanceText(result.damage, p1, p2, field.getSide(1), p1.mymoves[i], p1.mymoves[i].hits, p1.ability === 'Bad Dreams');
		var recoveryText = '';
		if (p1.mymoves[i].givesHealth) {
			var minHealthRecovered = notation === '%' ? Math.floor(minDamage * p1.mymoves[i].percentHealed * 1000 / p1.maxHP) /
			10 : Math.floor(minDamage * p1.mymoves[i].percentHealed * 48 / p1.maxHP);
			var maxHealthRecovered = notation === '%' ? Math.floor(maxDamage * p1.mymoves[i].percentHealed * 1000 / p1.maxHP) /
			10 : Math.floor(maxDamage * p1.mymoves[i].percentHealed * 48 / p1.maxHP);
			if (minHealthRecovered > 100 && notation === '%') {
				minHealthRecovered = Math.floor(p2.maxHP * p1.mymoves[i].percentHealed * 1000 / p1.maxHP) / 10;
				maxHealthRecovered = Math.floor(p2.maxHP * p1.mymoves[i].percentHealed * 1000 / p1.maxHP) / 10;
			} else if (notation !== '%' && minHealthRecovered > 48) {
				minHealthRecovered = Math.floor(p2.maxHP * p1.mymoves[i].percentHealed * 48 / p1.maxHP);
				maxHealthRecovered = Math.floor(p2.maxHP * p1.mymoves[i].percentHealed * 48 / p1.maxHP);
			}
			recoveryText = ' (' + minHealthRecovered + ' - ' + maxHealthRecovered + notation + ' recovered)';
		}
		var recoilText = '';
		if (typeof p1.mymoves[i].hasRecoil === 'number') {
			var damageOverflow = minDamage > p2.curHP || maxDamage > p2.curHP;
			var minRecoilDamage = notation === '%' ? Math.floor(Math.min(minDamage, p2.curHP) * p1.mymoves[i].hasRecoil * 10 / p1.maxHP) / 10 :
				Math.floor(Math.min(minDamage, p2.curHP) * p1.mymoves[i].hasRecoil * 0.48 / p1.maxHP);
			var maxRecoilDamage = notation === '%' ? Math.floor(Math.min(maxDamage, p2.curHP) * p1.mymoves[i].hasRecoil * 10 / p1.maxHP) / 10 :
				Math.floor(Math.min(maxDamage, p2.curHP) * p1.mymoves[i].hasRecoil * 0.48 / p1.maxHP);
			if (damageOverflow) {
				minRecoilDamage = notation === '%' ? Math.floor(p2.curHP * p1.mymoves[i].hasRecoil * 10 / p1.maxHP) / 10 :
					Math.floor(p2.maxHP * p1.mymoves[i].hasRecoil * 0.48 / p1.maxHP);
				maxRecoilDamage = notation === '%' ? Math.floor(p2.curHP * p1.mymoves[i].hasRecoil * 10 / p1.maxHP) / 10 :
					Math.floor(p2.curHP * p1.mymoves[i].hasRecoil * 0.48 / p1.maxHP);
			}
			recoilText = ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' recoil damage)';
		} else if (p1.mymoves[i].hasRecoil === 'crash') {
			var genMultiplier = gen === 2 ? 12.5 : gen >= 3 ? 50 : 1;
			var gen4CrashDamage = Math.floor(p2.maxHP * 0.5 / p1.maxHP * 100);
			var minRecoilDamage = notation === '%' ? Math.floor(Math.min(minDamage, p2.maxHP) * genMultiplier * 10 / p1.maxHP) / 10 :
				Math.floor(Math.min(minDamage, p2.maxHP) * genMultiplier * 0.48 / p1.maxHP);
			var maxRecoilDamage = notation === '%' ? Math.floor(Math.min(maxDamage, p2.maxHP) * genMultiplier * 10 / p1.maxHP) / 10 :
				Math.floor(Math.min(maxDamage, p2.maxHP) * genMultiplier * 0.48 / p1.maxHP);
			if (damageOverflow && gen !== 2) {
				minRecoilDamage = notation === '%' ? Math.floor(p2.curHP * genMultiplier * 10 / p1.maxHP) / 10 :
					Math.floor(p2.curHP * genMultiplier * 0.48 / p1.maxHP);
				maxRecoilDamage = notation === '%' ? Math.floor(p2.maxHP * genMultiplier * 10 / p1.maxHP) / 10 :
					Math.floor(Math.min(p2.maxHP, p1.maxHP) * genMultiplier * 0.48);
			}
			recoilText = gen === 1 ? ' (1hp damage on miss)' :
				gen === 2 ? (p2.type1 === "Ghost" || p2.type2 === "Ghost") ? ' (no crash damage on Ghost types)' : ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' crash damage on miss)' :
					gen === 3 ? (p2.type1 === "Ghost" || p2.type2 === "Ghost") ? ' (no crash damage on Ghost types)' : ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' crash damage on miss)' :
						gen === 4 ? (p2.type1 === "Ghost" || p2.type2 === "Ghost") ? ' (' + gen4CrashDamage + '% crash damage)' : ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' crash damage on miss)' :
							gen > 4 ? ' (50% crash damage)' :
								'';
		} else if (p1.mymoves[i].hasRecoil === 'Struggle') {
			recoilText = ' (25% struggle damage)';
		} else if (p1.mymoves[i].hasRecoil) {
			recoilText = ' (50% recoil damage)';
		}
		result.recoilText = recoilText;
		result.recoveryText = recoveryText;
		resultLocations[0][i] = {};
		if (p1.mymoves[i].name !== undefined)
			resultLocations[0][i].move = p1.mymoves[i].name.replace("Hidden Power", "HP");
		resultLocations[0][i].damage = minDisplay + " - " + maxDisplay + notation + recoveryText + recoilText;

		result = damageResults[1][i];
		var recoveryText = '';
		minDamage = result.damage[0] * p2.mymoves[i].hits;
		maxDamage = result.damage[result.damage.length - 1] * p2.mymoves[i].hits;
		p2.maxDamages.push({
			moveOrder : i,
			maxDamage : maxDamage
		});
		p2.maxDamages.sort(function (firstMove, secondMove) {
			return secondMove.maxDamage - firstMove.maxDamage;
		});
		minDisplay = notation === '%' ? Math.floor(minDamage * 1000 / p1.maxHP) / 10 : Math.floor(minDamage * 48 / p1.maxHP);
		maxDisplay = notation === '%' ? Math.floor(maxDamage * 1000 / p1.maxHP) / 10 : Math.floor(maxDamage * 48 / p1.maxHP);
		result.damageText = minDamage + "-" + maxDamage + " (" + minDisplay + " - " + maxDisplay + notation + ")";
		result.koChanceText = p2.mymoves[i].bp === 0 ? 'nice move' :
			getKOChanceText(result.damage, p2, p1, field.getSide(0), p2.mymoves[i], p2.mymoves[i].hits, p2.ability === 'Bad Dreams');
		if (p2.mymoves[i].givesHealth) {
			var minHealthRecovered = notation === '%' ? Math.floor(minDamage * p2.mymoves[i].percentHealed * 1000 / p2.maxHP) /
			10 : Math.floor(minDamage * p2.mymoves[i].percentHealed * 48 / p2.maxHP);
			var maxHealthRecovered = notation === '%' ? Math.floor(maxDamage * p2.mymoves[i].percentHealed * 1000 / p2.maxHP) /
			10 : Math.floor(maxDamage * p2.mymoves[i].percentHealed * 48 / p2.maxHP);
			if (minHealthRecovered > 100 && notation === '%') {
				minHealthRecovered = Math.floor(p1.maxHP * p2.mymoves[i].percentHealed * 1000 / p2.maxHP) / 10;
				maxHealthRecovered = Math.floor(p1.maxHP * p2.mymoves[i].percentHealed * 1000 / p2.maxHP) / 10;
			} else if (notation !== '%' && minHealthRecovered > 48) {
				minHealthRecovered = Math.floor(p1.maxHP * p2.mymoves[i].percentHealed * 48 / p2.maxHP);
				maxHealthRecovered = Math.floor(p1.maxHP * p2.mymoves[i].percentHealed * 48 / p2.maxHP);
			}
			recoveryText = ' (' + minHealthRecovered + ' - ' + maxHealthRecovered + notation + ' recovered)';
		}
		var recoilText = '';
		if (typeof p2.mymoves[i].hasRecoil === 'number') {
			var damageOverflow = minDamage > p1.curHP || maxDamage > p1.curHP;
			var minRecoilDamage = notation === '%' ? Math.floor(Math.min(minDamage, p1.curHP) * p2.mymoves[i].hasRecoil * 10 / p2.maxHP) / 10 :
				Math.floor(Math.min(minDamage, p1.curHP) * p2.mymoves[i].hasRecoil * 0.48 / p2.maxHP);
			var maxRecoilDamage = notation === '%' ? Math.floor(Math.min(maxDamage, p1.maxHP) * p2.mymoves[i].hasRecoil * 10 / p2.maxHP) / 10 :
				Math.floor(Math.min(maxDamage, p1.curHP) * p2.mymoves[i].hasRecoil * 0.48 / p2.maxHP);
			if (damageOverflow) {
				minRecoilDamage = notation === '%' ? Math.floor(Math.min(p1.maxHP * p2.mymoves[i].hasRecoil) * 10 / p2.maxHP) / 10 :
					Math.floor(p1.maxHP * p2.mymoves[i].recoilPercentage * 0.48 / p1.maxHP);
				maxRecoilDamage = notation === '%' ? Math.floor(Math.min(p1.maxHP, p2.mymoves[i].hasRecoil) * 10 / p2.maxHP) / 10 :
					Math.floor(Math.min(p1.maxHP, p2.mymoves[i].hasRecoil) * 0.48 / p2.maxHP);
			}
			recoilText = ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' recoil damage)';
		} else if (p2.mymoves[i].hasRecoil === 'crash') {
			var genMultiplier = gen === 2 ? 12.5 : gen >= 3 ? 50 : 1;
			var gen4CrashDamage = Math.floor(p2.maxHP * 0.5 / p1.maxHP * 100);
			var minRecoilDamage = notation === '%' ? Math.floor(Math.min(minDamage, p1.maxHP) * genMultiplier * 10 / p2.maxHP) / 10 :
				Math.floor(Math.min(minDamage, p1.maxHP) * 0.48 / p2.maxHP);
			var maxRecoilDamage = notation === '%' ? Math.floor(Math.min(maxDamage, p1.maxHP) * genMultiplier * 10 / p2.maxHP) / 10 :
				Math.floor(Math.min(maxDamage, p1.maxHP) * 0.48 / p2.maxHP);
			if (damageOverflow && gen !== 2) {
				minRecoilDamage = notation === '%' ? Math.floor(Math.min(p1.maxHP, genMultiplier) * 10 / p2.maxHP) / 10 :
					Math.floor(Math.min(p1.maxHP, p1.maxHP) * genMultiplier * 0.48);
				maxRecoilDamage = notation === '%' ? Math.floor(Math.min(p1.maxHP, genMultiplier) * 10 / p2.maxHP) / 10 :
					Math.floor(Math.min(p1.maxHP, p2.maxHP) * genMultiplier * 0.48);
			}
			recoilText = gen === 1 ? ' (1hp damage on miss)' :
				gen === 2 ? (p1.type1 === "Ghost" || p1.type2 === "Ghost") ? ' (no crash damage on Ghost types)' : ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' crash damage on miss)' :
					gen === 3 ? (p1.type1 === "Ghost" || p1.type2 === "Ghost") ? ' (no crash damage on Ghost types)' : ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' crash damage on miss)' :
						gen === 4 ? (p1.type1 === "Ghost" || p1.type2 === "Ghost") ? ' (' + gen4CrashDamage + '% crash damage)' : ' (' + minRecoilDamage + ' - ' + maxRecoilDamage + notation + ' crash damage on miss)' :
							gen > 4 ? ' (50% crash damage)' :
								'';
		} else if (p2.mymoves[i].hasRecoil === 'Struggle') {
			recoilText = ' (25% struggle damage)';
		} else if (p2.mymoves[i].hasRecoil) {
			recoilText = ' (50% recoil damage)';
		}
		result.recoilText = recoilText;
		result.recoveryText = recoveryText;
		var bestMove;
		resultLocations[1][i] = {};
		resultLocations[1][i].move = p2.mymoves[i].name.replace("Hidden Power", "HP");
		resultLocations[1][i].damage = minDisplay + " - " + maxDisplay + notation + recoveryText + recoilText;
		resultLocations[1][i].recoilText = recoilText;
		resultLocations[1][i].recoveryText = recoveryText;
		// damageResults[0][i].resultLocations = resultLocations;
		if (fastestSide === "tie") {
			battling.sort(function () {
				return 0.5 - Math.random();
			});
			bestMove = battling[0].maxDamages[0].moveOrder;
			var chosenPokemon = battling[0] === p1 ? "0" : "1";
			bestResult = resultLocations[chosenPokemon][bestMove].move;
		} else {
			bestMove = battling[fastestSide].maxDamages[0].moveOrder;
			bestResult = resultLocations[fastestSide][bestMove].move;
		}
	}
	// bestResult.prop("checked", true);
	// bestResult.change();
	// $("#resultHeaderL").text(p1.name + "'s Moves (select one to show detailed results)");
	// $("#resultHeaderR").text(p2.name + "'s Moves (select one to show detailed results)");
	for (var j = 0; j < damageResults.length; j++) {
		for (var i = 0; i < damageResults[j].length; i++) {
			var pp1 = p1, pp2 = p2;
			if(j === 0){
				pp1 = p2;
				pp2 = p1;
			}
			var defenderHp = pp1.maxHP * pp1.hp / 100;
			var dam = damageResults[j][i].damageText.replace(/ (.*)/, "").split("-");
			var d1 = Math.round(dam[0] / defenderHp * 100), d2 = Math.round(dam[1] / defenderHp * 100);
			damageResults[j][i].d1 = d1;
			damageResults[j][i].d2 = d2;
			var moves = pp2.moves;
			if (moves.length === 0)
				moves = pp2.set[Object.keys(pp2.set)[0]].moves;
			damageResults[j][i].moveName = moves[i];
		}
	}
	damageResults.fastestSide = fastestSide;
	return damageResults;
}


function getZMoveName(moveName, moveType, item) {
	return moveName.indexOf("Hidden Power") !== -1 ? "Breakneck Blitz" : // Hidden Power will become Breakneck Blitz
		moveName === "Clanging Scales" && item === "Kommonium Z" ? "Clangorous Soulblaze" :
			moveName === "Darkest Lariat" && item === "Incinium Z" ? "Malicious Moonsault" :
				moveName === "Giga Impact" && item === "Snorlium Z" ? "Pulverizing Pancake" :
					moveName === "Moongeist Beam" && item === "Lunalium Z" ? "Menacing Moonraze Maelstrom" :
						moveName === "Photon Geyser" && item === "Ultranecrozium Z" ? "Light That Burns the Sky" :
							moveName === "Play Rough" && item === "Mimikium Z" ? "Let\'s Snuggle Forever" :
								moveName === "Psychic" && item === "Mewnium Z" ? "Genesis Supernova" :
									moveName === "Sparkling Aria" && item === "Primarium Z" ? "Oceanic Operetta" :
										moveName === "Spectral Thief" && item === "Marshadium Z" ? "Soul-Stealing 7-Star Strike" :
											moveName === "Spirit Shackle" && item === "Decidium Z" ? "Sinister Arrow Raid" :
												moveName === "Stone Edge" && item === "Lycanium Z" ? "Splintered Stormshards" :
													moveName === "Sunsteel Strike" && item === "Solganium Z" ? "Searing Sunraze Smash" :
														moveName === "Thunderbolt" && item === "Aloraichium Z" ? "Stoked Sparksurfer" :
															moveName === "Thunderbolt" && item === "Pikashunium Z" ? "10,000,000 Volt Thunderbolt" :
																moveName === "Volt Tackle" && item === "Pikanium Z" ? "Catastropika" :
																	moveName === "Nature\'s Madness" && item === "Tapunium Z" ? "Guardian of Alola" :
																		ZMOVES_TYPING[moveType];
}


function Field() {
	this.format = false;//$("input:radio[name='format']:checked").val();
	this.isGravity = false;//$("#gravity").prop("checked");
	//stealth rocks left, right
	this.isSR = [false, false];//[$("#srL").prop("checked"), $("#srR").prop("checked")];
	this.weather;
	this.spikes;
	if (gen === 2) {
		this.spikes = [0, 0];//[$("#gscSpikesL").prop("checked") ? 1 : 0, $("#gscSpikesR").prop("checked") ? 1 : 0];
		this.weather = "";//$("input:radio[name='gscWeather']:checked").val();
	} else {
		this.weather = "";//$("input:radio[name='weather']:checked").val();
		this.spikes = [false, false];//[~~$("input:radio[name='spikesL']:checked").val(), ~~$("input:radio[name='spikesR']:checked").val()];
	}
	this.terrain = "";//($("input:checkbox[name='terrain']:checked").val()) ? $("input:checkbox[name='terrain']:checked").val() : "";
	this.isReflect = [false, false];//[$("#reflectL").prop("checked"), $("#reflectR").prop("checked")];
	this.isLightScreen = [false, false];//[$("#lightScreenL").prop("checked"), $("#lightScreenR").prop("checked")];
	this.isProtected = [false, false];//[$("#protectL").prop("checked"), $("#protectR").prop("checked")];
	this.isSeeded = [false, false];//[$("#leechSeedL").prop("checked"), $("#leechSeedR").prop("checked")];
	this.isForesight = [false, false];//[$("#foresightL").prop("checked"), $("#foresightR").prop("checked")];
	this.isHelpingHand = [false, false];//[$("#helpingHandR").prop("checked"), $("#helpingHandL").prop("checked")]; // affects attacks against opposite side
	this.isFriendGuard = [false, false];//[$("#friendGuardL").prop("checked"), $("#friendGuardR").prop("checked")];
	this.isAuroraVeil = [false, false];//[$("#auroraVeilL").prop("checked"), $("#auroraVeilR").prop("checked")];

	this.getWeather = function () {
		return this.weather;
	};
	this.clearWeather = function () {
		this.weather = "";
	};
	this.getSide = function (i) {
		return new Sider(this.format, this.terrain, this.weather, this.isGravity, this.isSR[i], this.spikes[i], this.isReflect[i], this.isLightScreen[i], this.isProtected[i], this.isSeeded[1 - i], this.isSeeded[i], this.isForesight[i], this.isHelpingHand[i], this.isFriendGuard[i], this.isAuroraVeil[i]);
	};
}


function Sider(format, terrain, weather, isGravity, isSR, spikes, isReflect, isLightScreen, isProtected, isAttackerSeeded, isDefenderSeeded, isForesight, isHelpingHand, isFriendGuard, isAuroraVeil) {
	this.format = format;
	this.terrain = terrain;
	this.weather = weather;
	this.isGravity = isGravity;
	this.isSR = isSR;
	this.spikes = spikes;
	this.isReflect = isReflect;
	this.isLightScreen = isLightScreen;
	this.isProtected = isProtected;
	this.isAttackerSeeded = isAttackerSeeded;
	this.isDefenderSeeded = isDefenderSeeded;
	this.isForesight = isForesight;
	this.isHelpingHand = isHelpingHand;
	this.isFriendGuard = isFriendGuard;
	this.isAuroraVeil = isAuroraVeil;
}

function setGenerationMoves(gen) {
	switch (gen) {
	case 1:
		calculateAllMoves = CALCULATE_ALL_MOVES_RBY;
		break;
	case 2:
		calculateAllMoves = CALCULATE_ALL_MOVES_GSC;
		break;
	case 3:
		calculateAllMoves = CALCULATE_ALL_MOVES_ADV;
		break;
	case 4:
		calculateAllMoves = CALCULATE_ALL_MOVES_DPP;
		break;
	default:
		calculateAllMoves = CALCULATE_ALL_MOVES_BW;
		break;
	}
}

function setGeneration(gen) {
	genWasChanged = true;
	setGenerationMoves(gen);
	switch (gen) {
	case 1:
		pokedex = POKEDEX_RBY;
		setdex = SETDEX_RBY;
		typeChart = TYPE_CHART_RBY;
		moves = MOVES_RBY;
		items = [];
		abilities = [];
		STATS = STATS_RBY;
		calcHP = CALC_HP_RBY;
		calcStat = CALC_STAT_RBY;
		break;
	case 2:
		pokedex = POKEDEX_GSC;
		setdex = SETDEX_GSC;
		typeChart = TYPE_CHART_GSC;
		moves = MOVES_GSC;
		items = ITEMS_GSC;
		abilities = [];
		STATS = STATS_GSC;
		calcHP = CALC_HP_RBY;
		calcStat = CALC_STAT_RBY;
		break;
	case 3:
		pokedex = POKEDEX_ADV;
		setdex = SETDEX_ADV;
		typeChart = TYPE_CHART_GSC;
		moves = MOVES_ADV;
		items = ITEMS_ADV;
		abilities = ABILITIES_ADV;
		STATS = STATS_GSC;
		calcHP = CALC_HP_ADV;
		calcStat = CALC_STAT_ADV;
		break;
	case 4:
		pokedex = POKEDEX_DPP;
		setdex = SETDEX_DPP;
		typeChart = TYPE_CHART_GSC;
		moves = MOVES_DPP;
		items = ITEMS_DPP;
		abilities = ABILITIES_DPP;
		STATS = STATS_GSC;
		calcHP = CALC_HP_ADV;
		calcStat = CALC_STAT_ADV;
		break;
	case 5:
		pokedex = POKEDEX_BW;
		setdex = SETDEX_BW;
		typeChart = TYPE_CHART_GSC;
		moves = MOVES_BW;
		items = ITEMS_BW;
		abilities = ABILITIES_BW;
		STATS = STATS_GSC;
		calcHP = CALC_HP_ADV;
		calcStat = CALC_STAT_ADV;
		break;
	case 6:
		pokedex = POKEDEX_XY;
		setdex = SETDEX_XY;
		typeChart = TYPE_CHART_XY;
		moves = MOVES_XY;
		items = ITEMS_XY;
		abilities = ABILITIES_XY;
		STATS = STATS_GSC;
		calcHP = CALC_HP_ADV;
		calcStat = CALC_STAT_ADV;
		break;
	default:
		pokedex = POKEDEX_SM;
		setdex = SETDEX_SM;
		typeChart = TYPE_CHART_XY;
		moves = MOVES_SM;
		items = ITEMS_SM;
		abilities = ABILITIES_SM;
		STATS = STATS_GSC;
		calcHP = CALC_HP_ADV;
		calcStat = CALC_STAT_ADV;
	}
}
