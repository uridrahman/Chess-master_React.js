import React, { Component } from 'react';
import './App.css';

class InteractiveView extends Component {
	static defaultProps = {
		bounds: {
			x: -Infinity,
			y: -Infinity,
			width: Infinity,
			height: Infinity
		},
		onTouch: v => {},
		onMove: (v, p) => {},
		onRelease: v => {}
	};

	set position(value) {
		if (!this.element) return;

		const pos = this.getBoundedPosition(value);
		this.element.style.left = `${pos.x}px`;
		this.element.style.top = `${pos.y}px`;
	}
	get position() {
		return this.element ? {
			x: this.element.offsetLeft,
			y: this.element.offsetTop
		} : null;
	}

	constructor() {
		super();

		this.touchHandler = this.touchHandler.bind(this);
		this.moveHandler = this.moveHandler.bind(this);
		this.releaseHandler = this.releaseHandler.bind(this);
		this.onRenderElement = this.onRenderElement.bind(this);
	}
	getBoundedPosition(pos) {
		const b = this.props.bounds;

		return {
			x: Math.min(Math.max(pos.x, b.x), b.width - this.width),
			y: Math.min(Math.max(pos.y, b.y), b.height - this.height)
		};
	}
	componentWillUnmount() {
		this.element.removeEventListener('mousedown', this.touchHandler);
		this.element.removeEventListener('touchstart', this.touchHandler);
		this.cleanUp();
	}
	onRenderElement(element) {
		if (!element)
			return;

		this.element = element;
	}
	cleanUp() {
		document.removeEventListener('mousemove', this.moveHandler);
		document.removeEventListener('mouseup', this.releaseHandler);
		document.removeEventListener('touchmove', this.moveHandler);
		document.removeEventListener('touchend', this.releaseHandler);
		document.removeEventListener('touchcancel', this.releaseHandler);
	}
	touchHandler(e) {
		e.preventDefault();

		const x = (e.touches || []).length > 0 ? e.touches[0].pageX : e.clientX,
			y = (e.touches || []).length > 0 ? e.touches[0].pageY : e.clientY;

		this.xi = x - this.element.offsetLeft;
		this.yi = y - this.element.offsetTop;
		this.element.style.zIndex = 1;

		this.props.onTouch(this);
		document.addEventListener('mousemove', this.moveHandler);
		document.addEventListener('mouseup', this.releaseHandler);
		document.addEventListener('touchmove', this.moveHandler);
		document.addEventListener('touchend', this.releaseHandler);
		document.addEventListener('touchcancel', this.releaseHandler);
	}
	moveHandler(e) {
		e.preventDefault();

		const x = (e.touches || []).length > 0 ? e.touches[0].pageX : e.clientX,
			y = (e.touches || []).length > 0 ? e.touches[0].pageY : e.clientY;

		const pos = this.getBoundedPosition({
			x: x - this.xi,
			y: y - this.yi
		});

		this.position = {
			...pos,
			...this.props.onMove(this, pos)
		};
	}
	releaseHandler(e) {
		this.cleanUp();
		
		this.position = {
			...this.position,
			...this.props.onRelease(this, this.position)
		};

		this.element.style.zIndex = 0;
	}
}

class Piece extends InteractiveView {
	static SYMBOLS = ['\u2659', '\u2656', '\u2658', '\u2657', '\u2655', '\u2654',
		'\u265F', '\u265C', '\u265E', '\u265D', '\u265B', '\u265A'];

	constructor(props) {
		super(props);

		this.width = props.wCell - 8;
		this.height = props.hCell - 8;
	}
	render() {
		const pos = this.alignCenter(this.props.col, this.props.row);

		this.isWhite = this.props.type < 6;

		return <div ref={this.onRenderElement} className='interactive-view'
			onMouseDown={this.props.enabled ? this.touchHandler : null}
			onTouchStart={this.props.enabled ? this.touchHandler : null} style={{
			fontSize: `${this.width*.75}px`,
			textAlign: 'center',
			textShadow: '0 0 10px #FFFFFF',
			cursor: this.props.enabled ? 'pointer' : 'default',
			//backgroundColor: 'red',
			width: `${this.width}px`,
			height: `${this.height}px`,
			left: `${pos.x}px`,
			top: `${pos.y}px`
		}}>{Piece.SYMBOLS[this.props.type]}</div>
	}
	alignCenter(col, row) {
		if (col == null)
			col = this.props.col;

		if (row == null)
			row = this.props.row;

		return {
			x: this.props.wCell*col + (this.props.wCell - this.width)/2,
			y: this.props.hCell*row + (this.props.hCell - this.height)/2
		};
	}
	canMove(col, row, mapping) {
		const piece = mapping[`${row}:${col}`],
			dc = Math.abs(this.props.col - col),
			dr = Math.abs(this.props.row - row),
			type = this.props.type;
		
		// except for knight
		const hasNoPiecesOnTheWay = () => {
			const colInc = dc === 0 ? 0 : this.props.col > col ? -1 : 1,
				rowInc = dr === 0 ? 0 : this.props.row > row ? -1 : 1,
				t = dc > 0 ? dc : dr;

			for (let i = 1, c = this.props.col + colInc, r = this.props.row + rowInc; i < t; ++i, c += colInc, r += rowInc)
				if (mapping[`${r}:${c}`])
					return false;

			return true;
		};

		// has not moved
		if ((dc === 0 && dr === 0) ||
			// piece in a non empty cell belongs to same team
			(piece != null && this.isWhite === piece.isWhite))
			// invalid move
			return false;

		const isEnemy = this.getIsEnemy(piece);
		let isValid = true;

		// validate move
		switch (type) {
			// bishop
			case 3:
			case 9:
				// diagonals
				isValid = dc === dr &&
					hasNoPiecesOnTheWay();
				break;

			// rook
			case 1:
			case 7:
				// horiontals and verticals
				isValid = ((dc > 0 && dr === 0) ||
					(dc === 0 && dr > 0)) &&
					hasNoPiecesOnTheWay();
				break;

			// queen
			case 4:
			case 10:
				// diagonals, horiontals and verticals
				isValid = (dc === dr ||
					(dc > 0 && dr === 0) ||
					(dc === 0 && dr > 0)) &&
					hasNoPiecesOnTheWay();
				break;

			// king
			case 5:
			case 11:
				// one cell at a time
				isValid = dc <= 1 && dr <= 1 &&
					// diagonals, horiontals and verticals
					(dc === dr ||
					(dc > 0 && dr === 0) ||
					(dc === 0 && dr > 0)) &&
					hasNoPiecesOnTheWay();
				break;

			// pawn
			case 0:
			case 6:
				// must be empty
				isValid = ((piece == null &&
					// verticals only
					dc === 0 &&
					// can move one cell or two if never moved
					(dr === 1 || (dr === 2 && this.props.row === (type === 0 ? 1 : 6))) &&
					hasNoPiecesOnTheWay()) ||
					// or one step diagonal if enemy
					((dc === 1 && dr === 1) && isEnemy)) &&
					// always forward
					Boolean(type === 0 ^ this.props.row > row);
				break;

			// knight
			case 2:
			case 8:
				// back and forth only
				isValid = (dc === 1 && dr === 2) ||
					(dc === 2 && dr === 1);
				break;

			default: break;
		}

		return isValid;
	}
	getIsEnemy(piece) {
		return piece != null && this.isWhite !== piece.isWhite;
	}
}

export default class App extends Component {
	// MUST be an exponent of two
	static TILE_SIZE = 32;
	static TILE_SIZE_HALF = App.TILE_SIZE >> 1;
	static BITS_EXP = Math.log(App.TILE_SIZE)/Math.log(2);
	static INITIAL_STATE = {
		board: [
			[1,2,3,4,5,3,2,1],
			[0,0,0,0,0,0,0,0],
			[-1,-1,-1,-1,-1,-1,-1,-1],
			[-1,-1,-1,-1,-1,-1,-1,-1],
			[-1,-1,-1,-1,-1,-1,-1,-1],
			[-1,-1,-1,-1,-1,-1,-1,-1],
			[6,6,6,6,6,6,6,6],
			[7,8,9,10,11,9,8,7]
		],
		highlight: null,
		players: [{
			score: 0,
			piecesWon: []
		},{
			score: 0,
			piecesWon: []
		}],
		isWhiteTurn: true,
		isGameOver: false
	};

	constructor() {
		super();

		this.state = App.INITIAL_STATE;
		this.wCell = App.TILE_SIZE;
		this.hCell = App.TILE_SIZE;
		this.width = this.wCell*this.state.board[0].length;
		this.height = this.hCell*this.state.board.length;

		this.onPieceMove = this.onPieceMove.bind(this);
		this.onPieceRelease = this.onPieceRelease.bind(this);
		this.reset = this.reset.bind(this);
	}
	render() {
		this.currentMap = {};

		const pieces = this.state.board.map((v,row) =>
			v.map((v,col) =>
				v > -1 ? <Piece ref={v => { if (v) this.currentMap[`${v.props.row}:${v.props.col}`] = v }}
					type={v} col={col} row={row} wCell={this.wCell} hCell={this.hCell}
					bounds={{
						x: 0,
						y: 0,
						width: this.width,
						height: this.height
					}}
					enabled={this.state.isWhiteTurn ^ v >= 6}
					onMove={this.onPieceMove}
					onRelease={this.onPieceRelease} /> : null));

		const highlight = this.state.highlight ? <div className='highlight'
			style={{
				width: this.wCell,
				height: this.hCell,
				left: this.state.highlight.col*this.wCell,
				top: this.state.highlight.row*this.hCell,
				backgroundColor: this.state.highlight.color
			}} /> : null

		const gameOver = this.state.isGameOver ? <div className='game-over'
			onClick={this.reset}
			style={{
				width: this.width,
				height: this.height,
				fontSize: `${this.wCell*.75}px`,
				paddingTop: `${this.height*.1}px`
			}}><strong>{this.state.isWhiteTurn ? 'Black' : 'White'} won!</strong><br/>
				Tap to restart</div> : null

		return (
			<div className='wrapper' ref='container'>
				<canvas ref='bg' width={this.width} height={this.height} />
				{highlight}
				{pieces}
				<div>
					<div><strong>Player 1:</strong> {this.state.players[0].score} pts</div>
					<div>{this.state.players[0].piecesWon
						.map(v => Piece.SYMBOLS[v])}</div>
					<div><strong>Player 2:</strong> {this.state.players[1].score} pts</div>
					<div>{this.state.players[1].piecesWon
						.map(v => Piece.SYMBOLS[v])}</div>
					<div>{this.state.isWhiteTurn ? 'White turn' : 'Black turn'}</div>
					<button onClick={this.reset}>Reset</button>
				</div>
				{gameOver}
			</div>
		);
	}
	componentDidMount() {
		this.drawBackground();
	}
	drawBackground() {
		const bg = this.refs.bg,
			ctx = bg.getContext('2d'),
			cols = this.state.board[0].length,
			rows = this.state.board.length;
		
		ctx.clearRect(0, 0, bg.width, bg.height);

		for (let r = rows, c; r--;) {
			for (c = cols; c--;) {
				ctx.fillStyle = (r + c) & 1 ? 'green' : 'lightgreen';
				ctx.fillRect(c << App.BITS_EXP, r << App.BITS_EXP, this.wCell, this.hCell);
			}
		}

		ctx.strokeRect(0, 0, this.width, this.height);
	}
	onPieceMove(piece, pos) {
		const row = Math.round(pos.y/this.hCell),
			col = Math.round(pos.x/this.wCell);

		if (row === this.lastMovedRow && col === this.lastMovedCol)
			return;

		this.lastMovedCol = col;
		this.lastMovedRow = row;

		this.setState({
			...this.state,
			highlight: row !== piece.props.row || col !== piece.props.col ? {
				col: col,
				row: row,
				color: this.canMove(col, row, piece) ? '#09c' : '#c60'
			} : null
		});
	}
	onPieceRelease(piece, pos) {
		//const col = Math.round(pos.x/this.wCell),
			//row = Math.round(pos.y/this.hCell),
		const col = (pos.x + App.TILE_SIZE_HALF) >> App.BITS_EXP,
			row = (pos.y + App.TILE_SIZE_HALF) >> App.BITS_EXP;

		const state = {
			...this.state,
			highlight: null
		};

		let initCoords = null;

		if (this.canMove(col, row, piece)) {
			if (piece.getIsEnemy(this.currentMap[`${row}:${col}`])) {
				state.players = state.players.slice();

				const playerIndex = +!piece.isWhite;
				const player = state.players[playerIndex];
				const enemyIndex = state.board[row][col];

				state.players[playerIndex] = {
					...player,
					score: player.score + 1,
					piecesWon: player.piecesWon.concat([enemyIndex])
				}

				if (enemyIndex === 5 || enemyIndex === 11)
					state.isGameOver = true;
			}

			state.board = this.state.board.map(v => v.slice());
			state.board[piece.props.row][piece.props.col] = -1;
			state.board[row][col] = piece.props.type;
			state.isWhiteTurn = !state.isWhiteTurn;
		}
		// reset
		else initCoords = piece.alignCenter();
		
		this.setState(state);

		return initCoords;
	}
	canMove(col, row, piece) {
		return piece.canMove(col, row, this.currentMap);
	}
	reset() {
		this.setState(App.INITIAL_STATE);
	}
}
