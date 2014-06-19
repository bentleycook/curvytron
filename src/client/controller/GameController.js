/**
 * Game Controller
 *
 * @param {Object} $scope
 * @param {Object} $routeParams
 * @param {RoomRepository} repository
 * @param {SocketClient} client
 */
function GameController($scope, $routeParams, repository, client)
{
    this.$scope     = $scope;
    this.repository = repository;
    this.client     = client;
    this.input      = new PlayerInput();

    createjs.Sound.alternateExtensions = ["mp3"];
    createjs.Sound.registerManifest(
        [
            {id:"loose", src:"loose.ogg"},
            {id:"win", src:"win.ogg"}
        ],
        "../sounds/"
    );

    // Binding
    this.onMove        = this.onMove.bind(this);
    this.onPosition    = this.onPosition.bind(this);
    this.onAngle       = this.onAngle.bind(this);
    this.onPoint       = this.onPoint.bind(this);
    this.onDie         = this.onDie.bind(this);
    this.onScore       = this.onScore.bind(this);
    this.onTrailClear  = this.onTrailClear.bind(this);
    this.onWarmup      = this.onWarmup.bind(this);
    this.endWarmup     = this.endWarmup.bind(this);
    this.onRoundNew    = this.onRoundNew.bind(this);
    this.onRoundEnd    = this.onRoundEnd.bind(this);
    this.onRoundWinner = this.onRoundWinner.bind(this);
    this.onEnd         = this.onEnd.bind(this);
    this.onLeave       = this.onLeave.bind(this);
    this.onMe          = this.onMe.bind(this);

    this.input.on('move', this.onMove);

    this.attachSocketEvents();

    // Hydrate scope:
    this.$scope.sortorder = "-score";

    this.loadGame($routeParams.name);
}

/**
 * Attach socket Events
 */
GameController.prototype.attachSocketEvents = function()
{
    this.client.io.on('me', this.onMe);
    this.client.io.on('position', this.onPosition);
    this.client.io.on('angle', this.onAngle);
    this.client.io.on('point', this.onPoint);
    this.client.io.on('die', this.onDie);
    this.client.io.on('score', this.onScore);
    this.client.io.on('trail:clear', this.onTrailClear);
    this.client.io.on('round:new', this.onRoundNew);
    this.client.io.on('round:end', this.onRoundEnd);
    this.client.io.on('round:winner', this.onRoundWinner);
    this.client.io.on('end', this.onEnd);
    this.client.io.on('game:leave', this.onLeave);
};

/**
 * Rooms action
 *
 * @return {Array}
 */
GameController.prototype.loadGame = function(name)
{
    var room = this.repository.get(name);

    this.room = room;
    this.game = room.newGame();

    this.game.fps.setElement(document.getElementById('fps'));

    // Hydrate scope:
    this.$scope.curvytron.bodyClass = "game-mode";
    this.$scope.game = this.game;

    this.client.join('game:' + name);
    this.client.io.emit('loaded');
};

/**
 * Start warmup
 */
GameController.prototype.displayWarmup = function(time)
{
    var controller = this;

    this.$scope.count       = time/1000;
    this.$scope.countFinish = false;
    this.applyScope();

    var warmupInterval = setInterval(this.onWarmup, 1000);

    setTimeout(function () { controller.endWarmup(warmupInterval); }, time);

    this.warmupInterval = warmupInterval;
};

/**
 * On warmup
 */
GameController.prototype.onWarmup = function()
{
    this.$scope.count--;
    this.$scope.$apply();
};

/**
 * End warmup
 */
GameController.prototype.endWarmup = function(interval)
{
    clearInterval(interval);

    if (this.warmupInterval === interval) {
        this.$scope.countFinish = true;
        this.applyScope();
    } else {
        console.log(this.warmupInterval, interval);
    }
};

/**
 * On move
 *
 * @param {Event} e
 */
GameController.prototype.onMove = function(e)
{
    this.client.io.emit('player:move', e.detail);
};

/**
 * On me
 *
 * @param {Object} data
 */
GameController.prototype.onMe = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.setMe(true);
    }
};

/**
 * On position
 *
 * @param {Object} data
 */
GameController.prototype.onPosition = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.setPosition(data.point);

        if (!this.game.isStarted()) {
            paper.view.draw();
        }
    }
};

/**
 * On angle
 *
 * @param {Object} data
 */
GameController.prototype.onAngle = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.setAngle(data.angle);

        if (!this.game.isStarted()) {
            paper.view.draw();
        }
    }
};

/**
 * On point
 *
 * @param {Object} data
 */
GameController.prototype.onPoint = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.addPoint(data.point);
    }
};

/**
 * On die
 *
 * @param {Object} data
 */
GameController.prototype.onDie = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.die();
        this.applyScope();

        var loose = createjs.Sound.play("loose");
        loose.volume = 0.2;
    }
};

/**
 * On score
 *
 * @param {Object} data
 */
GameController.prototype.onScore = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.setScore(data.score);
        this.applyScope();
    }
};

/**
 * On trail clear
 *
 * @param {Object} data
 */
GameController.prototype.onTrailClear = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        avatar.trail.clear();
    }
};

/**
 * On round new
 *
 * @param {Game} game
 */
GameController.prototype.onRoundNew = function()
{
    this.displayWarmup(this.game.warmupTime);
    this.game.newRound();

    document.getElementById('end').style.display        = 'none';
    document.getElementById('game-view').style.display  = 'none';
    document.getElementById('round-view').style.display = 'none';

    paper.view.draw();
};

/**
 * On round new
 *
 * @param {Game} game
 */
GameController.prototype.onRoundEnd = function()
{
    this.game.endRound();

    paper.view.draw();
};

/**
 * On round new
 *
 * @param {Game} game
 */
GameController.prototype.onEnd = function()
{
    this.game.end();

    document.getElementById('end').style.display = 'block';
    document.getElementById('game-view').style.display = 'block';
    document.getElementById('round-view').style.display = 'none';

    var win = createjs.Sound.play("win");
    win.volume = 0.3;

    paper.view.draw();
};

/**
 * On round new
 *
 * @param {Game} game
 */
GameController.prototype.onRoundWinner = function(data)
{
    var avatar = this.game.avatars.getById(data.winner);

    if (avatar) {
        this.$scope.roundWinner = avatar;
        this.applyScope();

        document.getElementById('end').style.display = 'block';
        document.getElementById('round-view').style.display = 'block';
    }
};

/**
 * On leave
 *
 * @param {Object} data
 */
GameController.prototype.onLeave = function(data)
{
    var avatar = this.game.avatars.getById(data.avatar);

    if (avatar) {
        this.game.removeAvatar(avatar);
        this.applyScope();
    }
};

/**
 * Apply scope
 */
GameController.prototype.applyScope = function()
{
    this.$scope.$apply();
};
