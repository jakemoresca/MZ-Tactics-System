//=============================================================================
// Tactics_PrepaPhase.js
//=============================================================================

/*:
 * @plugindesc Add-on to manage unit party before the battle.
 * Requires: Tactics_Basic.js.
 * 
 * @author Bilal El Moussaoui (https://twitter.com/arleq1n)
 *
 * @param Start Scope Color
 * @desc The color to display the start position.
 * @default #FFD700
 *
 * @param Start Battle Term
 * @desc The start battle term.
 * @default Start Battle
 *
 * @param Preparation Phase Id
 * @desc The switch id to set if it's the preparation phase.
 * @default 4
 *
 * @help
 *
 * For more information, please consult :
 *   - https://forums.rpgmakerweb.com/index.php?threads/tactics-system-1-0.117600/
 */

var BattlePreparation = BattlePreparation || {};
BattlePreparation.Parameters = PluginManager.parameters('Tactics_PrepaPhase');

BattlePreparation.startScopeColor =    String(BattlePreparation.Parameters['Start Scope Color']);
BattlePreparation.startBattleTerm =    String(BattlePreparation.Parameters['Start Battle Term']);
BattlePreparation.preparationPhaseId = Number(BattlePreparation.Parameters['Preparation Phase Id']);

//-----------------------------------------------------------------------------
// Scene_Tactics
//
// The scene class of the tactics screen.

BattlePreparation.Scene_Tactics_start = Scene_Tactics.prototype.start;
Scene_Tactics.prototype.start = function() {
    BattlePreparation.Scene_Tactics_start.call(this);
    if (this._registerWindow2) {
        this._registerWindow2.refresh();
    }
    TacticsManager.setWindowStatus(this._formationWindow);
};

BattlePreparation.Scene_Tactics_createAllWindows = Scene_Tactics.prototype.createAllWindows;
Scene_Tactics.prototype.createAllWindows = function() {
    BattlePreparation.Scene_Tactics_createAllWindows.call(this);
    this.createFormationWindow();
    if (TacticsManager.isPrepaPhase()) {
        this._registerWindow1 = this._mapWindow;
        this._registerWindow2 = this._statusWindow;
        this._mapWindow = this._prepaWindow;
        this._statusWindow = this._formationWindow;
        this.callMenu();
        this.menuCalling = false;
    } else {
        this._prepaWindow.close();
        this._formationWindow.close();
        this._mapWindow.refresh();
    }
};

BattlePreparation.Scene_Tactics_createLogWindow = Scene_Tactics.prototype.createLogWindow;
Scene_Tactics.prototype.createLogWindow = function() {
    BattlePreparation.Scene_Tactics_createLogWindow.call(this);
    this.createPreparationWindow();
};

Scene_Tactics.prototype.createLogWindowBefore = function() {
    this._logWindow = new Window_BattleLog();
    this.addWindow(this._logWindow);
};

Scene_Tactics.prototype.createPreparationWindow = function() {
    this._prepaWindow = new Window_TacticsPrepa(0, 0);
    this._prepaWindow.setHandler('startBattle', this.commandStartBattle.bind(this));
    this._prepaWindow.setHandler('equip',       this.commandPersonal.bind(this));
    this._prepaWindow.setHandler('status',      this.commandPersonal.bind(this));
    this._prepaWindow.setHandler('formation',   this.commandFormation.bind(this));
    this._prepaWindow.setHandler('options',     this.commandOptions.bind(this));
    this._prepaWindow.setHandler('gameEnd',     this.commandGameEnd.bind(this));
    this._prepaWindow.setHandler('cancel',      this.commandCancelMapWindow.bind(this));
    this.addWindow(this._prepaWindow);
};

Scene_Tactics.prototype.createFormationWindow = function() {
    var wx = this._prepaWindow.x + this._prepaWindow.width;
    this._formationWindow = new Window_TacticsFormation(wx, 0);
    this._formationWindow.reserveFaceImages();
    this.addWindow(this._formationWindow);
};

Scene_Tactics.prototype.commandStartBattle = function() {
    SoundManager.playOk();
    TacticsManager.onStartBattle();
    this.commandCancelMapWindow();
    this._mapWindow = this._registerWindow1;
    this._statusWindow = this._registerWindow2;
};

Scene_Tactics.prototype.commandFormation = function() {
    this._formationWindow.setFormationMode(true);
    this._formationWindow.selectLast();
    this._formationWindow.activate();
    this._formationWindow.setHandler('ok',     this.onFormationOk.bind(this));
    this._formationWindow.setHandler('cancel', this.onFormationCancel.bind(this));
    this._formationWindow.show();
};

Scene_Tactics.prototype.onFormationOk = function() {
    var index = this._formationWindow.index();
    var actor = $gameParty.members()[index];
    var pendingIndex = this._formationWindow.pendingIndex();
    if (pendingIndex >= 0) {
        $gamePartyTs.swapOrder(index, pendingIndex);
        this._formationWindow.setPendingIndex(-1);
        this._formationWindow.redrawItem(index);
    } else {
        this._formationWindow.setPendingIndex(index);
    }
    this._formationWindow.activate();
};

Scene_Tactics.prototype.onFormationCancel = function() {
    if (this._formationWindow.pendingIndex() >= 0) {
        this._formationWindow.setPendingIndex(-1);
        this._formationWindow.activate();
    } else {
        this._formationWindow.deselect();
        this._mapWindow.activate();
    }
    var select = $gameSelector.select();
    if (select && select.isAlive()) {
        this._actorWindow.open(select);
    } else {
        this._actorWindow.close();
    }
};

BattlePreparation.Scene_Tactics_isAnyInputWindowActive = Scene_Tactics.prototype.isAnyInputWindowActive;
Scene_Tactics.prototype.isAnyInputWindowActive = function() {
    return (BattlePreparation.Scene_Tactics_isAnyInputWindowActive.call(this) || this._formationWindow.active);
};


BattlePreparation.Scene_Tactics_refreshStatus = Scene_Tactics.prototype.refreshStatus;
Scene_Tactics.prototype.refreshStatus = function() {
    BattlePreparation.Scene_Tactics_refreshStatus.call(this);
};

//-----------------------------------------------------------------------------
// TacticsManager
//
// The static class that manages tactics progress.

TacticsManager.onStartBattle = function() {
    this._phase = 'startPhase';
    this._battlePhase = '';
    $gameMap.clearStartTiles();
    this.startBattle();
};

BattlePreparation.TacticsManager_startBattle = TacticsManager.startBattle;
TacticsManager.startBattle = function() {
    if (!this.isPrepaPhase()) {
        BattlePreparation.TacticsManager_startBattle.call(this);
    }
};

TacticsManager.isPrepaPhase = function () {
    return this._phase === 'preparationPhase';
};

TacticsManager.setWindowStatus = function (statusWindow) {
    this._formationWindow = statusWindow;
};

BattlePreparation.TacticsManager_createGameObjects = TacticsManager.createGameObjects;
TacticsManager.createGameObjects = function() {
    BattlePreparation.TacticsManager_createGameObjects.call(this);
    var isStartPrepa = false;
    for (var i = 0; i < $gameMap.events().length; i++) {
        var event = $gameMap.events()[i];
        if (event.tparam('start')) {
            isStartPrepa = true;
            $gameMap.addStartTile(event);
            $gamePartyTs.addAutoActor(event);
        }
    }
    if (isStartPrepa) {
        this.startPrepaPhase();
    }
    $gamePartyTs.setupMembers();
};

TacticsManager.startPrepaPhase = function() {
    this._phase = 'preparationPhase';
    this._battlePhase = 'explore';
    $gameSelector.setTransparent(false);
    $gameTroopTs.onTurnStart();
    $gamePartyTs.onTurnStart();
    this.refreshMoveTiles();
};

BattlePreparation.TacticsManager_isActive = TacticsManager.isActive;
TacticsManager.isActive = function() {
    if (!this._logWindow.isBusy()) {
        switch (this._phase) {
        case 'preparationPhase':
            return true;
        }
    }
    return BattlePreparation.TacticsManager_isActive.call(this);
};

BattlePreparation.TacticsManager_update = TacticsManager.update;
TacticsManager.update = function() {
    if (!this.isBusy() && !this.updateEvent()) {
        switch (this._phase) {
        case 'preparationPhase':
            this.updatePreparationPhase();
            break;
        default:
            BattlePreparation.TacticsManager_update.call(this);
            break;
        }
    }
};

TacticsManager.updatePreparationPhase = function() {
    switch (this._battlePhase) {
    case 'explore':
        this.updateStartExplore();
        break;
    case 'select':
        this.updateStartSelect();
        break;
    }
};

TacticsManager.updateStartExplore = function() {
    this.refreshSubject();
    var x = $gameSelector.x;
    var y = $gameSelector.y;
    if ($gameMap.isOnStartTiles(x, y)) {
        if ($gameSelector.isOk()) {
            SoundManager.playOk();
            this.selectPending();
        }
    }
}

TacticsManager.selectPending = function() {
    this._battlePhase = 'select';
    $gameSelector.updateSelect();
    this._subject = $gameSelector.select();
    var x = $gameSelector.x;
    var y = $gameSelector.y;
    if (this._subject) {
        this._subject.performSelect();
    } else {
        this._subject = $gameMap.eventIdXy(x, y);
    }
};

TacticsManager.updateStartSelect = function() {
    this.refreshSubstitute();
    var x = $gameSelector.x;
    var y = $gameSelector.y;
    if ($gameMap.isOnStartTiles(x, y)) {
        if ($gameSelector.isOk()) {
            SoundManager.playOk();
            this.substituteBattler();
        }
    }
};

TacticsManager.substituteBattler = function() {
    var x = this._subject.x;
    var y = this._subject.y;
    var eventId1 = $gameMap.eventIdXy(x, y);
    var index1 = $gamePartyTs.eventIndex(eventId1);
    
    x = $gameSelector.x;
    y = $gameSelector.y;
    eventId1 = $gameMap.eventIdXy(x, y);
    var index2 = $gamePartyTs.eventIndex(eventId1);
    
    $gamePartyTs.swapOrder(index1, index2);
    this._enemyWindow.close();
    this._formationWindow.redrawItem(index1);
    this._formationWindow.redrawItem(index2);
    this._battlePhase = 'explore';
}

TacticsManager.refreshSubstitute = function() {
    var select = $gameSelector.select();
    if (select && select.isAlive()) {
        this._enemyWindow.open(select);
    } else {
        this._enemyWindow.close();
    }
};

BattlePreparation.TacticsManager_updateEvent = TacticsManager.updateEvent;
TacticsManager.updateEvent = function() {
    BattlePreparation.TacticsManager_updateEvent.call(this);
    switch (this._phase) {
    case 'preparationPhase':
        $gameSwitches.update();
        $gameVariables.update();
    }
};

//-----------------------------------------------------------------------------
// Game_PartyTs
//
// The game object class for a party tactics.

Game_PartyTs.prototype.initialize = function() {
    Game_UnitTs.prototype.initialize.call(this);
    this.clear();
};

BattlePreparation.Game_PartyTs_clear = Game_PartyTs.prototype.clear;
Game_PartyTs.prototype.clear = function() {
    BattlePreparation.Game_PartyTs_clear.call(this);
    this._events = [];
    this._fixedMembers = 0;
};

Game_PartyTs.prototype.addAutoActor = function(event) {
    var actorId = $gameParty.firstMemberAvailable();
    if (actorId !== -1) {
        this.addActor(actorId, event, true);
        this._fixedMembers -= 1;
    } else {
        this._maxBattleMembers += 1;
        this._actors.push(-1);
        this._events.push(event.eventId());
    }
};

Game_PartyTs.prototype.eventIndex = function(eventId) {
    return this._events.indexOf(eventId);
};

BattlePreparation.Game_PartyTs_addActor = Game_PartyTs.prototype.addActor;
Game_PartyTs.prototype.addActor = function(actorId, event, needRefresh) {
    if (!this._actors.contains(actorId)) {
        this._fixedMembers += 1;
        var eventId = event.eventId();
        this._events.push(eventId);
    };
    BattlePreparation.Game_PartyTs_addActor.call(this, actorId, event, needRefresh);
};

Game_PartyTs.prototype.index = function(actorId) {
    return this._actors.indexOf(actorId);
};

BattlePreparation.Game_Party_members = Game_PartyTs.prototype.members;
Game_PartyTs.prototype.members = function() {
    return this.allMembers().slice(0, this._maxBattleMembers).filter(function(actor) {
        return actor;
    });
};

Game_PartyTs.prototype.allMembers = function() {
    return this._actors.map(function(id) {
        return $gameActors.actor(id);
    });
};

Game_PartyTs.prototype.setupMembers = function() {
    this._actors.concat($gameParty.actors()).forEach(function(actorId) {
        if (this._actors.indexOf(actorId) == -1) {
            this._actors.push(actorId);
        }
    }, this);
};

Game_PartyTs.prototype.swapOrder = function(index1, index2) {
    if (this.isBattleMember(index1) && this.isBattleMember(index2)) {
        this.swapPosition(index1, index2);
    } else {
        this.insertInBattleMembers(index1, index2);
    }
    var temp = this._actors[index1];
    this._actors[index1] = this._actors[index2];
    this._actors[index2] = temp;
    $gamePlayer.refresh();
};

Game_PartyTs.prototype.isBattleMember = function(index) {
    return index < this._maxBattleMembers;
};

Game_PartyTs.prototype.swapPosition = function(index1, index2) {
    var event1 = $gameMap.event(this._events[index1]);
    var event2 = $gameMap.event(this._events[index2]);
    var x = event1.x;
    var y = event1.y;
    event1.setPosition(event2.x, event2.y);
    event2.setPosition(x, y);
    var temp = this._events[index1];
    this._events[index1] = this._events[index2];
    this._events[index2] = temp;
};

Game_PartyTs.prototype.insertInBattleMembers = function(index1, index2) {
    var actor1 = this.allMembers()[index1];
    var actor2 = this.allMembers()[index2];
    if (index2 < this._maxBattleMembers && actor1) {
        actor1.setupEvent(this._events[index2]);
        actor1.refreshImage();
    }
    if (index1 < this._maxBattleMembers && actor2) {
        actor2.setupEvent(this._events[index1]);
        actor2.refreshImage();
    }
};

Game_PartyTs.prototype.isFixedMember = function(index) {
    return index < this._fixedMembers;
}

//-----------------------------------------------------------------------------
// Game_Party
//
// The game object class for the party. Information such as gold and items is
// included.

Game_Party.prototype.firstMemberAvailable = function() {
    for (var i = 0; i < this._actors.length; i++) {
        var actorId = this._actors[i];
        if (!$gamePartyTs.actors().contains(actorId)) {
            return actorId;
        }
    }
    return -1;
};

Game_Party.prototype.actors = function() {
    return this._actors;
};

//-----------------------------------------------------------------------------
// Window_TacticsPrepa
//
// The window for displaying essential commands for progressing though the game.

function Window_TacticsPrepa() {
    this.initialize.apply(this, arguments);
}

Window_TacticsPrepa.prototype = Object.create(Window_MenuCommand.prototype);
Window_TacticsPrepa.prototype.constructor = Window_TacticsPrepa;

Window_TacticsPrepa.prototype.initialize = function(x, y) {
    Window_MenuCommand.prototype.initialize.call(this, x, y);
    this.selectLast();
    this.hide();
    this.deactivate();
};

Window_TacticsPrepa._lastCommandSymbol = null;

Window_TacticsPrepa.initCommandPosition = function() {
    this._lastCommandSymbol = null;
};

Window_TacticsPrepa.prototype.windowWidth = function() {
    return 240;
};

Window_TacticsPrepa.prototype.numVisibleRows = function() {
    return this.maxItems();
};

Window_TacticsPrepa.prototype.addMainCommands = function() {
    var enabled = this.areMainCommandsEnabled();
    this.addCommand(BattlePreparation.startBattleTerm, 'startBattle');
    if (this.needsCommand('equip')) {
        this.addCommand(TextManager.equip, 'equip', enabled);
    }
    if (this.needsCommand('status')) {
        this.addCommand(TextManager.status, 'status', enabled);
    }
};

Window_TacticsPrepa.prototype.addOriginalCommands = function() {
};

Window_TacticsPrepa.prototype.addSaveCommand = function() {
};

Window_TacticsPrepa.prototype.selectLast = function() {
    this.selectSymbol(Window_TacticsPrepa._lastCommandSymbol);
};

//-----------------------------------------------------------------------------
// Window_MenuStatusTS
//
// The window for displaying party member status on the menu screen.

function Window_TacticsFormation() {
    this.initialize.apply(this, arguments);
}

Window_TacticsFormation.prototype = Object.create(Window_MenuStatus.prototype);
Window_TacticsFormation.prototype.constructor = Window_TacticsFormation;

Window_TacticsFormation.prototype.maxItems = function() {
    return $gamePartyTs.allMembers().length;
};

Window_TacticsFormation.prototype.processOk = function() {
    Window_Selectable.prototype.processOk.call(this);
    var actor = $gamePartyTs.allMembers()[this.index()];
    if (actor) {
        $gameParty.setMenuActor($gamePartyTs.allMembers()[this.index()]);
    }
};

Window_TacticsFormation.prototype.isCurrentItemEnabled = function() {
    if (this._formationMode) {
        var actor = $gamePartyTs.allMembers()[this.index()];
        return !$gamePartyTs.isFixedMember(this.index());
    } else {
        return true;
    }
};

Window_TacticsFormation.prototype.selectLast = function() {
    this.select($gameParty.menuActor().index() || 0);
};

Window_TacticsFormation.prototype.drawItemImage = function(index) {
    var actor = $gamePartyTs.allMembers()[index];
    var rect = this.itemRect(index);
    if (actor) {
        this.changePaintOpacity($gamePartyTs.isBattleMember(index));
        this.drawActorFace(actor, rect.x + 1, rect.y + 1, Window_Base._faceWidth, Window_Base._faceHeight);
        this.changePaintOpacity(true);
    }
};

Window_TacticsFormation.prototype.drawItemStatus = function(index) {
    var actor = $gamePartyTs.allMembers()[index];
    var rect = this.itemRect(index);
    if (actor) {
        var x = rect.x + 162;
        var y = rect.y + rect.height / 2 - this.lineHeight() * 1.5;
        var width = rect.width - x - this.textPadding();
        this.drawActorSimpleStatus(actor, x, y, width);
    }
};

//-----------------------------------------------------------------------------
// Game_Map
//
// The game object class for a map. It contains scrolling and passage
// determination functions.

BattlePreparation.Game_Map_intialize = Game_Map.prototype.initialize;
Game_Map.prototype.initialize = function() {
    BattlePreparation.Game_Map_intialize.call(this);
    this._startTiles = [];
};

Game_Map.prototype.clearStartTiles = function() {
    this._startTiles = [];
};

Game_Map.prototype.startTiles = function() {
    return this._startTiles;
};

Game_Map.prototype.addStartTile = function(event) {
    var x = event.x;
    var y = event.y;
    var tile = $gameMap.tile(x, y);
    this._startTiles.push(tile);
};

Game_Map.prototype.isOnStartTiles = function(x, y) {
    return this._startTiles.contains(this.tile(x, y));
};

Game_Map.prototype.setStartColor = function() {
    this._color = TacticsSystem.moveScopeColor;
};


//-----------------------------------------------------------------------------
// Game_Switches
//
// The game object class for switches.

BattlePreparation.Game_Switches_updatePhase = Game_Switches.prototype.updatePhase;
Game_Switches.prototype.updatePhase = function() {
    BattlePreparation.Game_Switches_updatePhase.call(this);
    this.setValue(BattlePreparation.preparationPhaseId, false);
    switch (TacticsManager.phase()) {
    case 'preparationPhase':
        this.setValue(BattlePreparation.preparationPhaseId, true);
        break;
    }
};

//-----------------------------------------------------------------------------
// Spriteset_Tactics
//
// The set of sprites on the tactics screen.

BattlePreparation.Spriteset_Tactics_createBaseTiles = Spriteset_Tactics.prototype.createBaseTiles;
Spriteset_Tactics.prototype.createBaseTiles = function() {
    BattlePreparation.Spriteset_Tactics_createBaseTiles.call(this);
    this._startTilesSprite = this.createTiles(BattlePreparation.startScopeColor);
};

BattlePreparation.Spriteset_Tactics_updateTiles = Spriteset_Tactics.prototype.updateTiles;
Spriteset_Tactics.prototype.updateTiles = function() {
    BattlePreparation.Spriteset_Tactics_updateTiles.call(this);
    if (this._startTiles !== $gameMap.startTiles()) {
        this.updateStartTiles();
    }
};

Spriteset_Tactics.prototype.updateStartTiles = function() {
    this._startTiles = $gameMap.startTiles();
    var width = $gameMap.width();
    var height = $gameMap.height();
    this._startTilesSprite.bitmap.clearRect(0, 0, width * 48, height * 48);
    this._rangeTilesSprite.color = BattlePreparation.startScopeColor;
    this._startTiles.forEach(function(tile) {
        var x = $gameMap.positionTileX(tile) * 48;
        var y = $gameMap.positionTileY(tile) * 48;
        var color = this._startTilesSprite.color;
        this._startTilesSprite.bitmap.fillRect(x + 2, y + 2, 44, 44, color);
    }, this);
};