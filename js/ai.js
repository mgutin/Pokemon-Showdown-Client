
function getAction() {
	if(!room.battle.yourSide.active[0]) {
		var arr = [];
		for(var i = 0; i<room.myPokemon.length;i++)
			if(room.myPokemon[i].hp > 0)
				arr.push(room.myPokemon[i]);
		return {description: arr[Math.floor(Math.random() * arr.length)].species,mon:{active:false}};
	}
	function getBestMove(mon,j) {
		if(!j)
			j = 0;
		var best = undefined;
		var bestD = undefined;
		for(var i = 0; i<mon.damage[j].length; i++) {
			if(!best){
				best = mon.damage[j][i];
				bestD = best.d1;
				continue;
			}
			if (mon.damage[j][i].d1 > bestD){
				best = mon.damage[j][i];
				bestD = best.d1;
			}
		}
		return best;
	}
	//opsBest and myBest is bestMoves' damage[0|1].d1
	function checker(opsBest,myBest,faster,isSwitchIn,vv) {
		//faster 0 is you 1 is ops TIE is tie
		//Opponent will kill you on switch in
		if(isSwitchIn && opsBest.d1 > 100)
			return 1e6;
		if(faster === 0 && myBest.d1 > 100) {
			//you're faster and you're active just kill it
			if(!isSwitchIn)
				return -1e6;
			//you're faster and you can kill it, but you'll take damage
			return -1e6+opsBest.d1;
		}
		var z = 1, y = 2;
		if(faster === 0){
			y = 1;
			z = 2;
		}
		return 100/(z*myBest.d1) - 100/(y*opsBest.d1+(isSwitchIn?vv.d1:0)*2);
	}
	//TODO room.battle.p1.pokemon  get's all known opponent's pokemon
	//TODO on switch in have first move not best, but best against active mon
	//TODO choice items lock in your move to the same one
	//TODO status like frozen
	var allpokemon = new AllPokemon();
	var active = allpokemon.getActivePokemon();
	var vv = 0;
	if(active) {
		vv = getBestMove(active, 1);
		var m = getBestMove(active);
		var dps = checker(vv, m, active.speed);
		if (dps < 0)
			return {
				description: active.myMon.name + ": " + Tools.getMove(m.moveName).name,
				mon: active,
				move: getBestMove(active),
				dps: dps
			};
	}
	var bestBench = [];
	for(var i = 0; i<allpokemon.allDamage.length; i++){
		var m = getBestMove(allpokemon.allDamage[i]);
		bestBench.push({
			description: allpokemon.allDamage[i].myMon.name+": "+Tools.getMove(m.moveName).name,
			mon: allpokemon.allDamage[i],
			dps: checker(getBestMove(allpokemon.allDamage[i],1),m,allpokemon.allDamage[i].speed,active !== undefined,vv),
			move: m
		});
	}
	bestBench.sort(function (a,b) {
		return a.dps - b.dps;
	});
	return bestBench[0];
}

function AllPokemon(opponentMon) {
	var field = getField();
	var myPokemon = [];
	var boosts = {};
	var attacker = room.battle.p2, defender = room.battle.p1;
	if(attacker.id === room.battle.yourSide.id){
		attacker = room.battle.p1;
		defender = room.battle.p2;
	}
	if(attacker.active[0] !== null && attacker.active[0].boosts !== undefined)
		boosts = attacker.active[0].boosts;
	if(room.battle.yourSide.active[0])
		var ym = new POKEMONValue(room.battle.yourSide.active[0]);
	if(opponentMon !== undefined)
		ym = new POKEMONValue(opponentMon);
	for(var i = 0; i < room.myPokemon.length; i++) {
		var pMon = jQuery.extend(true, {}, room.myPokemon[i]);
		var isActive = room.myPokemon[i].active;
		if(isActive)
			pMon.boosts = boosts;
		else
			pMon.boosts = {};
		var mm = new POKEMONValue(pMon);
		if(mm.curHP === 0)
			continue;
		myPokemon.push({
			active: isActive,
			myMon: mm,
			yourMon: ym,
			damage: ym ? calculateDamage(mm,ym,field) : 0,
			speed: ym ? whosFaster(i) : "TIE"
		});
	}
	this.field = field;
	this.allDamage = myPokemon;


	this.getActivePokemon = function () {
		for(var i = 0; i<this.allDamage.length; i++)
			if(this.allDamage[i].active)
				return this.allDamage[i];
	};

	this.getYourFasterPokemon = function () {
		var faster = [];
		for(var i = 0; i<this.allDamage.length; i++)
			if(this.allDamage[i].speed === 0)
				faster.push(this.allDamage[i]);
		return faster;
	};

	this.getOHKOPokemon = function () {
		var OHKO = [];
		for(var i = 0; i<this.allDamage.length; i++)
			for(var j = 0; j<this.allDamage[i].damage[0].length; j++)
				if(this.allDamage[i].damage[0][j].d1 > 100)
					OHKO.push(this.allDamage[i]);
		return OHKO;
	};

	this.getOpponentBestMoveAgainstActive = function () {
		var bestMoves = undefined;
		var best = undefined;
		var oppD = this.getActivePokemon().damage[1];
		for(var i = 0; i<oppD.length; i++) {
			if (oppD[i].d1 > 100) {
				if(!bestMoves)
					bestMoves = [];
				bestMoves.push(oppD[i]);
			}
			if(!best)
				best = oppD[i];
			else if(best.d1 < oppD[i].d1)
				best = oppD[i];
		}
		if(bestMoves)
			return bestMoves;
		var ties = [best];
		for(var i = 0; i<oppD.length; i++)
			if(oppD[i].d1 === ties[0].d1 && oppD[i].moveName !== ties[0].moveName)
				ties.push(oppD[i]);
		return ties;
	};

	this.getYourLeastDamageAgainstOppBestMove = function () {
		var bestMoves = this.getOpponentBestMoveAgainstActive();
		var bestMon = undefined;
		var best = undefined;
		for(var i = 0; i<this.allDamage.length; i++){
			for(var j = 0; j<bestMoves.length; j++) {
				var oppD = getMoveByNameForObject(bestMoves[j],this.allDamage[i].damage[1]);
				if (oppD.d1 === 0){
					if(!bestMon)
						bestMon = [];
					bestMon.push(this.allDamage[i]);
				}
				if(!best)
					best = this.allDamage[i];
				else if(getMoveByNameForObject(bestMoves[j],best.damage[1]).d1 > oppD.d1)
					best = this.allDamage[i];
			}
		}
		if(bestMon)
			return bestMon;
		var ties = [best];
		return ties;
	};

	function getMoveByNameForObject(name,obj) {
		for(var i = 0; i<obj.length; i++)
			if(Tools.getMove(obj[i].moveName).name === name.moveName)
				return obj[i];
	}

	this.getMoveByName = function(name){
		var moves = [];
		for(var i = 0; i<this.allDamage.length; i++)
			for(var j = 0; j<this.allDamage[i].damage.length; j++)
				if(this.allDamage[i].damage[0][j].moveName === name)
					moves.push(this.allDamage[i].damage[0][j]);
		return moves;
	};
}

function whosFaster(thing) {
	//thing is pokemon index or your0 for opponent's mon
	var p = _p(thing);
	var theirActive = room.battle.yourSide.active[0];
	var psuedoWeather = room.battle.pseudoWeather;
	var isTrickRoom = false;
	for(var i = 0; i<psuedoWeather.length; i++)
		if(psuedoWeather[i][0] === "Trick Room")
			isTrickRoom = true;
	var theirSpeed = maxSpeed();
	if(theirActive.boosts["spe"]) {
		theirSpeed *= 1 + (theirActive.boosts["spe"] / 2);
	}
	if (theirActive.item.name == "Choice Scarf") {
		theirSpeed *= 1.5;
	}
	var mySpeed = _calculateModifiedStats(p.pokemon, p.data)["spe"];
	if (room.battle.p1.sideConditions["tailwind"] != undefined ) {
		theirSpeed *= 2;
	}
	if (room.battle.p2.sideConditions["tailwind"] != undefined ) {
		mySpeed *= 2;
	}
	if (mySpeed > theirSpeed) {
		speedChar = isTrickRoom?'&#9660;':'&#9650;';
	} else if (mySpeed == theirSpeed) {
		speedChar = '&#61';
	} else {
		speedChar = isTrickRoom?'&#9650;':'&#9660;';
	}
	return speedChar === '&#61' ? "Tie" : speedChar === '&#9650;' ? 0 : 1;
}
function _p(thing) {
	var type = "sidepokemon";
	var text = '';
	switch (type) {
		case 'move':
		case 'zmove':
			var move = Tools.getMove(thing);
			if (!move) return;
			// text = this.showMoveTooltip(move, type === 'zmove');
			break;

		case 'pokemon':
			var side = room.battle[thing.slice(0, -1) + "Side"];
			var pokemon = side.active[thing.slice(-1)];
			if (!pokemon) return;
		/* falls through */
		case 'sidepokemon':
			var pokemonData;
			var isActive = (type === 'pokemon');
			if (room.myPokemon) {
				if (!pokemon) {
					pokemonData = room.myPokemon[parseInt(thing, 10)];
					pokemon = pokemonData;
				} else if (room.controlsShown && pokemon.side === room.battle.mySide) {
					// battlePokemon = pokemon;
					pokemonData = room.myPokemon[pokemon.slot];
				}
			}
			return { pokemon: pokemon, data: pokemonData, active: isActive };
			break;
	}
}

function maxSpeed() {
	var theirActive = room.battle.yourSide.active[0];
	return _maxSpeed(Tools.getTemplate(theirActive.species),theirActive.level);
}
function _maxSpeed(template, level) {
	var baseSpe = template.baseStats['spe'];
	var tier = room.battle.tier;
	var gen = room.battle.gen;
	if (gen < 7) {
		var overrideStats = BattleTeambuilderTable['gen' + gen].overrideStats[template.id];
		if (overrideStats && 'spe' in overrideStats) baseSpe = overrideStats['spe'];
	}

	var iv = (gen < 3) ? 30 : 31;
	var isRandomBattle = tier.indexOf('Random Battle') >= 0 || (tier.indexOf('Random') >= 0 && tier.indexOf('Battle') >= 0 && gen >= 6);
	var value = iv + ((isRandomBattle && gen >= 3) ? 21 : 63);
	var nature = (isRandomBattle || gen < 3) ? 1 : 1.1;
	return Math.floor(Math.floor(Math.floor(2 * baseSpe + value) * level / 100 + 5) * nature);
}
function _calculateModifiedStats(pokemon, pokemonData) {
	var stats = {};
	for (var statName in pokemonData.stats) {
		stats[statName] = pokemonData.stats[statName];

		if (pokemon.boosts && pokemon.boosts[statName]) {
			var boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
			if (pokemon.boosts[statName] > 0) {
				stats[statName] *= boostTable[pokemon.boosts[statName]];
			} else {
				if (room.battle.gen <= 2) boostTable = [1, 100 / 66, 2, 2.5, 100 / 33, 100 / 28, 4];
				stats[statName] /= boostTable[-pokemon.boosts[statName]];
			}
			stats[statName] = Math.floor(stats[statName]);
		}
	}

	var ability = toId(pokemonData.ability || pokemon.ability || pokemonData.baseAbility);
	if (pokemon.volatiles && 'gastroacid' in pokemon.volatiles) ability = '';

	// check for burn, paralysis, guts, quick feet
	if (pokemon.status) {
		if (room.battle.gen > 2 && ability === 'guts') {
			stats.atk = Math.floor(stats.atk * 1.5);
		} else if (pokemon.status === 'brn') {
			stats.atk = Math.floor(stats.atk * 0.5);
		}

		if (room.battle.gen > 2 && ability === 'quickfeet') {
			stats.spe = Math.floor(stats.spe * 1.5);
		} else if (pokemon.status === 'par') {
			if (room.battle.gen > 6) {
				stats.spe = Math.floor(stats.spe * 0.5);
			} else {
				stats.spe = Math.floor(stats.spe * 0.25);
			}
		}
	}

	// gen 1 doesn't support items
	if (room.battle.gen <= 1) {
		for (var statName in stats) {
			if (stats[statName] > 999) stats[statName] = 999;
		}
		return stats;
	}

	var item = toId(pokemonData.item);
	if (ability === 'klutz' && item !== 'machobrace') item = '';
	var species = pokemon.baseSpecies;

	// check for light ball, thick club, metal/quick powder
	// the only stat modifying items in gen 2 were light ball, thick club, metal powder
	if (item === 'lightball' && species === 'Pikachu') {
		if (room.battle.gen >= 4) stats.atk *= 2;
		stats.spa *= 2;
	}

	if (item === 'thickclub') {
		if (species === 'Marowak' || species === 'Cubone') {
			stats.atk *= 2;
		}
	}

	if (species === 'Ditto' && !('transform' in pokemon.volatiles)) {
		if (item === 'quickpowder') {
			stats.spe *= 2;
		}
		if (item === 'metalpowder') {
			if (room.battle.gen === 2) {
				stats.def = Math.floor(stats.def * 1.5);
				stats.spd = Math.floor(stats.spd * 1.5);
			} else {
				stats.def *= 2;
			}
		}
	}

	// check abilities other than Guts and Quick Feet
	// check items other than light ball, thick club, metal/quick powder
	if (room.battle.gen <= 2) {
		return stats;
	}

	var weather = room.battle.weather;
	if (weather) {
		// Check if anyone has an anti-weather ability
		for (var i = 0; i < room.battle.p1.active.length; i++) {
			if (room.battle.p1.active[i] && room.battle.p1.active[i].ability in {'Air Lock': 1, 'Cloud Nine': 1}) {
				weather = '';
				break;
			}
			if (room.battle.p2.active[i] && room.battle.p2.active[i].ability in {'Air Lock': 1, 'Cloud Nine': 1}) {
				weather = '';
				break;
			}
		}
	}

	if (item === 'choiceband') {
		stats.atk = Math.floor(stats.atk * 1.5);
	}
	if (ability === 'purepower' || ability === 'hugepower') {
		stats.atk *= 2;
	}
	if (ability === 'hustle') {
		stats.atk = Math.floor(stats.atk * 1.5);
	}
	if (weather) {
		if (weather === 'sunnyday' || weather === 'desolateland') {
			if (ability === 'solarpower') {
				stats.spa = Math.floor(stats.spa * 1.5);
			}
			if(pokemon.side) {
				var allyActive = pokemon.side.active;
				if (allyActive.length > 1) {
					for (var i = 0; i < allyActive.length; i++) {
						var ally = allyActive[i];
						if (!ally || ally.fainted) continue;
						if (ally.ability === 'flowergift' && (ally.baseSpecies === 'Cherrim' || room.battle.gen <= 4)) {
							stats.atk = Math.floor(stats.atk * 1.5);
							stats.spd = Math.floor(stats.spd * 1.5);
						}
					}
				}
			}
		}
		if (room.battle.gen >= 4 && pokemonHasType(pokemonData, 'Rock') && weather === 'sandstorm') {
			stats.spd = Math.floor(stats.spd * 1.5);
		}
		if (ability === 'chlorophyll' && (weather === 'sunnyday' || weather === 'desolateland')) {
			stats.spe *= 2;
		}
		if (ability === 'swiftswim' && (weather === 'raindance' || weather === 'primordialsea')) {
			stats.spe *= 2;
		}
		if (ability === 'sandrush' && weather === 'sandstorm') {
			stats.spe *= 2;
		}
		if (ability === 'slushrush' && weather === 'hail') {
			stats.spe *= 2;
		}
	}
	if (ability === 'defeatist' && pokemonData.hp <= pokemonData.maxhp / 2) {
		stats.atk = Math.floor(stats.atk * 0.5);
		stats.spa = Math.floor(stats.spa * 0.5);
	}
	if (pokemon.volatiles) {
		if ('slowstart' in pokemon.volatiles) {
			stats.atk = Math.floor(stats.atk * 0.5);
			stats.spe = Math.floor(stats.spe * 0.5);
		}
		if (ability === 'unburden' && 'itemremoved' in pokemon.volatiles && !item) {
			stats.spe *= 2;
		}
	}
	if (ability === 'marvelscale' && pokemon.status) {
		stats.def = Math.floor(stats.def * 1.5);
	}
	if (item === 'eviolite' && Tools.getTemplate(pokemon.species).evos) {
		stats.def = Math.floor(stats.def * 1.5);
		stats.spd = Math.floor(stats.spd * 1.5);
	}
	if (ability === 'grasspelt' && room.battle.hasPseudoWeather('Grassy Terrain')) {
		stats.def = Math.floor(stats.def * 1.5);
	}
	if (ability === 'surgesurfer' && room.battle.hasPseudoWeather('Electric Terrain')) {
		stats.spe *= 2;
	}
	if (item === 'choicespecs') {
		stats.spa = Math.floor(stats.spa * 1.5);
	}
	if (item === 'deepseatooth' && species === 'Clamperl') {
		stats.spa *= 2;
	}
	if (item === 'souldew' && room.battle.gen <= 6 && (species === 'Latios' || species === 'Latias')) {
		stats.spa = Math.floor(stats.spa * 1.5);
		stats.spd = Math.floor(stats.spd * 1.5);
	}
	if (ability === 'plus' || ability === 'minus') {
		var allyActive = pokemon.side.active;
		if (allyActive.length > 1) {
			var abilityName = (ability === 'plus' ? 'Plus' : 'Minus');
			for (var i = 0; i < allyActive.length; i++) {
				var ally = allyActive[i];
				if (!(ally && ally !== pokemon && !ally.fainted)) continue;
				if (!(ally.ability === 'Plus' || ally.ability === 'Minus')) continue;
				if (room.battle.gen <= 4 && ally.ability === abilityName) continue;
				stats.spa = Math.floor(stats.spa * 1.5);
				break;
			}
		}
	}
	if (item === 'assaultvest') {
		stats.spd = Math.floor(stats.spd * 1.5);
	}
	if (item === 'deepseascale' && species === 'Clamperl') {
		stats.spd *= 2;
	}
	if (item === 'choicescarf') {
		stats.spe = Math.floor(stats.spe * 1.5);
	}
	if (item === 'ironball' || item === 'machobrace' || /power(?!herb)/.test(item)) {
		stats.spe = Math.floor(stats.spe * 0.5);
	}
	if (ability === 'furcoat') {
		stats.def *= 2;
	}

	return stats;
}
function getPokemonTypes(pokemon) {
	var template = pokemon;
	if (!pokemon.types) template = Tools.getTemplate(pokemon.species);
	if (pokemon.volatiles && pokemon.volatiles.formechange) {
		template = Tools.getTemplate(pokemon.volatiles.formechange[2]);
	}

	var types = template.types;
	if (room.battle.gen < 7) {
		var table = BattleTeambuilderTable['gen' + room.battle.gen];
		if (template.speciesid in table.overrideType) types = table.overrideType[template.speciesid].split('/');
	}

	if (pokemon.volatiles && pokemon.volatiles.typechange) types = pokemon.volatiles.typechange[2].split('/');
	if (pokemon.volatiles && pokemon.volatiles.typeadd) {
		if (types && types.indexOf(pokemon.volatiles.typeadd[2]) === -1) types = types.concat(pokemon.volatiles.typeadd[2]);
	}
	return types;
}
function pokemonHasType(pokemon, type, types) {
	if (!types) types = getPokemonTypes(pokemon);
	for (var i = 0; i < types.length; i++) {
		if (types[i] === type) return true;
	}
	return false;
}
/*
	//your pokemon
	pokemonAttacker.boosts = {};
	var attacker = room.battle.p2, defender = room.battle.p1;//room.battle.p2.id === pokemonDefender.id ? room.battle.p1 : room.battle.p2;
	if(attacker.id === pokemonDefender.id){
		attacker = room.battle.p1;
		defender = room.battle.p2;
	}
	if(attacker.active[0] !== null && attacker.active[0].boosts !== undefined)
		pokemonAttacker.boosts = attacker.active[0].boosts;

	var damage = calculateDamage(this.attacker, this.defender, field);
 */
