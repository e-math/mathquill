/***************************
 * Commands and Operators.
 **************************/

var CharCmds = {}, LatexCmds = {}; //single character commands, LaTeX commands

var scale, // = function(jQ, x, y) { ... }
//will use a CSS 2D transform to scale the jQuery-wrapped HTML elements,
//or the filter matrix transform fallback for IE 5.5-8, or gracefully degrade to
//increasing the fontSize to match the vertical Y scaling factor.

//ideas from http://github.com/louisremi/jquery.transform.js
//see also http://msdn.microsoft.com/en-us/library/ms533014(v=vs.85).aspx

  forceIERedraw = $.noop,
  div = document.createElement('div'),
  div_style = div.style,
  transformPropNames = {
    transform:1,
    WebkitTransform:1,
    MozTransform:1,
    OTransform:1,
    msTransform:1
  },
  transformPropName;

for (var prop in transformPropNames) {
  if (prop in div_style) {
    transformPropName = prop;
    break;
  }
}

if (transformPropName) {
  scale = function(jQ, x, y) {
    jQ.css(transformPropName, 'scale('+x+','+y+')');
  };
}
else if ('filter' in div_style) { //IE 6, 7, & 8 fallback, see https://github.com/laughinghan/mathquill/wiki/Transforms
  forceIERedraw = function(el){ el.className = el.className; };
  scale = function(jQ, x, y) { //NOTE: assumes y > x
    x /= (1+(y-1)/2);
    jQ.addClass('matrixed').css({
      fontSize: y + 'em',
      marginTop: '-.1em',
      filter: 'progid:DXImageTransform.Microsoft'
        + '.Matrix(M11=' + x + ",SizingMethod='auto expand')"
    });
    function calculateMarginRight() {
      jQ.css('marginRight', (1+jQ.width())*(x-1)/x + 'px');
    }
    calculateMarginRight();
    var intervalId = setInterval(calculateMarginRight);
    $(window).load(function() {
      clearTimeout(intervalId);
      calculateMarginRight();
    });
  };
}
else {
  scale = function(jQ, x, y) {
    jQ.css('fontSize', y + 'em');
  };
}

function proto(parent, child) { //shorthand for prototyping
  child.prototype = parent.prototype;
  return child;
}

function bind(cons) { //shorthand for binding arguments to constructor
  var args = Array.prototype.slice.call(arguments, 1);

  return proto(cons, function() {
    cons.apply(this, Array.prototype.concat.apply(args, arguments));
  });
}

//because I miss the <font> tag
//(that's a joke, I hate this, it's like actively *fighting*
// separation of presentation and content and everything HTML and CSS
// are about, but it's an intrinsic problem with WYSIWYG)
//TODO: WYSIWYM?
function Style(cmd, html_template, replacedFragment) {
  this.init(cmd, [ html_template ], undefined, replacedFragment);
}
proto(MathCommand, Style);
//fonts
LatexCmds.mathrm = bind(Style, '\\mathrm', '<span class="roman font"></span>');
LatexCmds.mathit = bind(Style, '\\mathit', '<i class="font"></i>');
LatexCmds.mathbf = bind(Style, '\\mathbf', '<b class="font"></b>');
LatexCmds.mathsf = bind(Style, '\\mathsf', '<span class="sans-serif font"></span>');
LatexCmds.mathtt = bind(Style, '\\mathtt', '<span class="monospace font"></span>');
// Added by pesasa/pekasa for e-math
LatexCmds.unit = bind(Style, '\\unit', '<span style="margin-left: 0.2em;" class="roman font unit"></span>');
LatexCmds.solution = bind(Style, '\\solution', '<span class="solution"></span>');
LatexCmds.extramot = bind(Style, '\\extramot', '<span class="extramotivation"></span>');
//text-decoration
LatexCmds.underline = bind(Style, '\\underline', '<span class="underline"></span>');
LatexCmds.overline = LatexCmds.bar = bind(Style, '\\overline', '<span class="overline"></span>');

// Colors for E-math by pesasa
LatexCmds.red = bind(Style, '\\red', '<span class="color_red"></span>');
LatexCmds.blue = bind(Style, '\\blue', '<span class="color_blue"></span>');
LatexCmds.green = bind(Style, '\\green', '<span class="color_green"></span>');
LatexCmds.violet = bind(Style, '\\violet', '<span class="color_violet"></span>');
LatexCmds.orange = bind(Style, '\\orange', '<span class="color_orange"></span>');


function SupSub(cmd, html, text, replacedFragment) {
  this.init(cmd, [ html ], [ text ], replacedFragment);
}
_ = SupSub.prototype = new MathCommand;
_.latex = function() {
  var latex = this.firstChild.latex();
  if (latex.length === 1)
    return this.cmd + latex;
  else
    return this.cmd + '{' + (latex || ' ') + '}';
};
_.redraw = function() {
  if (this.prev)
    this.prev.respace();
  //SupSub::respace recursively calls respace on all the following SupSubs
  //so if prev is a SupSub, no need to call respace on this or following nodes
  if (!(this.prev instanceof SupSub)) {
    this.respace();
    //and if next is a SupSub, then this.respace() will have already called
    //this.next.respace()
    if (this.next && !(this.next instanceof SupSub))
      this.next.respace();
  }
};
_.respace = function() {
  if (
    this.prev.cmd === '\\int ' || (
      this.prev instanceof SupSub && this.prev.cmd != this.cmd
      && this.prev.prev && this.prev.prev.cmd === '\\int '
    )
  ) {
    if (!this.limit) {
      this.limit = true;
      this.jQ.addClass('limit');
    }
  }
  else {
    if (this.limit) {
      this.limit = false;
      this.jQ.removeClass('limit');
    }
  }

  this.respaced = this.prev instanceof SupSub && this.prev.cmd != this.cmd && !this.prev.respaced;
  if (this.respaced) {
    var fontSize = +this.jQ.css('fontSize').slice(0,-2),
      prevWidth = this.prev.jQ.outerWidth()
      thisWidth = this.jQ.outerWidth();
    this.jQ.css({
      left: (this.limit && this.cmd === '_' ? -.25 : 0) - prevWidth/fontSize + 'em',
      marginRight: .1 - min(thisWidth, prevWidth)/fontSize + 'em'
        //1px extra so it doesn't wrap in retarded browsers (Firefox 2, I think)
    });
  }
  else if (this.limit && this.cmd === '_') {
    this.jQ.css({
      left: '-.25em',
      marginRight: ''
    });
  }
  else {
    this.jQ.css({
      left: '',
      marginRight: ''
    });
  }

  if (this.next instanceof SupSub)
    this.next.respace();

  return this;
};

LatexCmds.subscript = LatexCmds._ = proto(SupSub, function(replacedFragment) {
  SupSub.call(this, '_', '<sub></sub>', '_', replacedFragment);
});

LatexCmds.superscript =
LatexCmds.supscript =
LatexCmds['^'] = proto(SupSub, function(replacedFragment) {
  SupSub.call(this, '^', '<sup></sup>', '**', replacedFragment);
});

function Fraction(replacedFragment) {
  this.init('\\frac', undefined, undefined, replacedFragment);
  this.jQ.append('<span style="display:inline-block;width:0">&nbsp;</span>');
}
_ = Fraction.prototype = new MathCommand;
_.html_template = [
  '<span class="fraction"></span>',
  '<span class="numerator"></span>',
  '<span class="denominator"></span>'
];
_.text_template = ['(', '/', ')'];

LatexCmds.frac = LatexCmds.dfrac = LatexCmds.cfrac = LatexCmds.fraction = Fraction;

function LiveFraction() {
  Fraction.apply(this, arguments);
}
_ = LiveFraction.prototype = new Fraction;
_.placeCursor = function(cursor) { //TODO: better architecture so this can be done more cleanly, highjacking MathCommand::placeCursor doesn't seem like the right place to do this
  if (this.firstChild.isEmpty()) {
    var prev = this.prev;
    while (prev &&
      !(
        prev instanceof BinaryOperator ||
        prev instanceof TextBlock ||
        prev instanceof BigSymbol
      ) //lookbehind for operator
    )
      prev = prev.prev;

    if (prev instanceof BigSymbol && prev.next instanceof SupSub) {
      prev = prev.next;
      if (prev.next instanceof SupSub && prev.next.cmd != prev.cmd)
        prev = prev.next;
    }

    if (prev !== this.prev) { //FIXME: major Law of Demeter violation, shouldn't know here that MathCommand::initBlocks does some initialization that MathFragment::blockify doesn't
      var newBlock = new MathFragment(this.parent, prev, this).blockify();
      newBlock.jQ = this.firstChild.jQ.empty().removeClass('empty').append(newBlock.jQ).data(jQueryDataKey, { block: newBlock });
      newBlock.next = this.lastChild;
      newBlock.parent = this;
      this.firstChild = this.lastChild.prev = newBlock;
    }
  }
  cursor.appendTo(this.lastChild);
};

LatexCmds.over = CharCmds['/'] = LiveFraction;

function SquareRoot(replacedFragment) {
  this.init('\\sqrt', undefined, undefined, replacedFragment);
}
_ = SquareRoot.prototype = new MathCommand;
_.html_template = [
  '<span class="block"><span class="sqrt-prefix">&radic;</span></span>',
  '<span class="sqrt-stem"></span>'
];
_.text_template = ['sqrt(', ')'];
_.redraw = function() {
  var block = this.lastChild.jQ;
  scale(block.prev(), 1, block.innerHeight()/+block.css('fontSize').slice(0,-2) - .1);
};
_.optional_arg_command = 'nthroot';

LatexCmds.sqrt = LatexCmds['√'] = SquareRoot;

function NthRoot(replacedFragment) {
  SquareRoot.call(this, replacedFragment);
  this.jQ = this.firstChild.jQ.detach().add(this.jQ);
}
_ = NthRoot.prototype = new SquareRoot;
_.html_template = [
  '<span class="block"><span class="sqrt-prefix">&radic;</span></span>',
  '<sup class="nthroot"></sup>',
  '<span class="sqrt-stem"></span>'
];
_.text_template = ['sqrt[', '](', ')'];
_.latex = function() {
  return '\\sqrt['+this.firstChild.latex()+']{'+this.lastChild.latex()+'}';
};

LatexCmds.nthroot = NthRoot;

// Round/Square/Curly/Angle Brackets (aka Parens/Brackets/Braces)
function Bracket(open, close, cmd, end, replacedFragment) {
  this.init('\\left'+cmd,
    ['<span class="block"><span class="paren">'+open+'</span><span class="block"></span><span class="paren">'+close+'</span></span>'],
    [open, close],
    replacedFragment);
  this.end = '\\right'+end;
}
_ = Bracket.prototype = new MathCommand;
_.initBlocks = function(replacedFragment) { //FIXME: possible Law of Demeter violation, hardcore MathCommand::initBlocks knowledge needed here
  this.firstChild = this.lastChild =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  this.firstChild.parent = this;
  this.firstChild.jQ = this.jQ.children(':eq(1)')
    .data(jQueryDataKey, {block: this.firstChild})
    .append(this.firstChild.jQ);

  var block = this.blockjQ = this.firstChild.jQ;
  this.bracketjQs = block.prev().add(block.next());
};
_.latex = function() {
  return this.cmd + this.firstChild.latex() + this.end;
};
_.redraw = function() {
  var height = this.blockjQ.outerHeight()/+this.blockjQ.css('fontSize').slice(0,-2);
  scale(this.bracketjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
};

LatexCmds.lbrace = CharCmds['{'] = proto(Bracket, function(replacedFragment) {
  Bracket.call(this, '{', '}', '\\{', '\\}', replacedFragment);
});
LatexCmds.langle = LatexCmds.lang = proto(Bracket, function(replacedFragment) {
  Bracket.call(this,'&lang;','&rang;','\\langle ','\\rangle ',replacedFragment);
});

// Closing bracket matching opening bracket above
function CloseBracket(open, close, cmd, end, replacedFragment) {
  Bracket.apply(this, arguments);
}
_ = CloseBracket.prototype = new Bracket;
_.placeCursor = function(cursor) {
  //if I'm at the end of my parent who is a matching open-paren, and I was not passed
  //  a selection fragment, get rid of me and put cursor after my parent
  if (!this.next && this.parent.parent && this.parent.parent.end === this.end && this.firstChild.isEmpty())
    cursor.backspace().insertAfter(this.parent.parent);
  else {
    this.firstChild.blur();
    this.redraw();
  }
};

LatexCmds.rbrace = CharCmds['}'] = proto(CloseBracket, function(replacedFragment) {
  CloseBracket.call(this, '{','}','\\{','\\}',replacedFragment);
});
LatexCmds.rangle = LatexCmds.rang = proto(CloseBracket, function(replacedFragment) {
  CloseBracket.call(this,'&lang;','&rang;','\\langle ','\\rangle ',replacedFragment);
});

function Paren(open, close, replacedFragment) {
  Bracket.call(this, open, close, open, close, replacedFragment);
}
Paren.prototype = Bracket.prototype;

LatexCmds.lparen = CharCmds['('] = proto(Paren, function(replacedFragment) {
  Paren.call(this, '(', ')', replacedFragment);
});
LatexCmds.lbrack = LatexCmds.lbracket = CharCmds['['] = proto(Paren, function(replacedFragment) {
  Paren.call(this, '[', ']', replacedFragment);
});

function CloseParen(open, close, replacedFragment) {
  CloseBracket.call(this, open, close, open, close, replacedFragment);
}
CloseParen.prototype = CloseBracket.prototype;

LatexCmds.rparen = CharCmds[')'] = proto(CloseParen, function(replacedFragment) {
  CloseParen.call(this, '(', ')', replacedFragment);
});
LatexCmds.rbrack = LatexCmds.rbracket = CharCmds[']'] = proto(CloseParen, function(replacedFragment) {
  CloseParen.call(this, '[', ']', replacedFragment);
});

function Pipes(replacedFragment) {
  Paren.call(this, '|', '|', replacedFragment);
}
_ = Pipes.prototype = new Paren;
_.placeCursor = function(cursor) {
  if (!this.next && this.parent.parent && this.parent.parent.end === this.end && this.firstChild.isEmpty())
    cursor.backspace().insertAfter(this.parent.parent);
  else
    cursor.appendTo(this.firstChild);
};

_.latex = function() {
  return '\\abs{' + this.firstChild.latex() + '}';
};


LatexCmds.lpipe = LatexCmds.rpipe = CharCmds['|'] = Pipes;
//LatexCmds.lpipe = LatexCmds.rpipe = Pipes;

/***
 * Abs and Norm functions for E-Math
 ***/

function Abs(replacedFragment){
  this.init('\\abs', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">|</span>').prependTo(this.jQ)
      .add($('<span class="paren">|</span>').appendTo(this.jQ));
}
_ = Abs.prototype = new MathCommand;
_.html_template = [
  '<span class="block"></span>',
  '<span class="abs"></span>'
];
_.text_template = ['abs(',')'];
_.redraw = Bracket.prototype.redraw;
//LatexCmds.abs = CharCmds['|'] = Abs;
LatexCmds.abs = CharCmds['\u00a6'] = Abs; // Use ¦ for shortcut

function Norm(replacedFragment){
  this.init('\\norm', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">||</span>').prependTo(this.jQ)
      .add($('<span class="paren">||</span>').appendTo(this.jQ));
}
_ = Norm.prototype = new MathCommand;
_.html_template = [
  '<span class="block"></span>',
  '<span class="norm"></span>'
];
_.text_template = ['norm(',')'];
_.redraw = Bracket.prototype.redraw;
LatexCmds.norm = Norm;

/***
 * Open and half open intervals for E-Math
 ***/

function OpenBoth(replacedFragment){
  this.init('\\openBoth', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">]</span>').prependTo(this.jQ)
      .add($('<span class="paren">[</span>').appendTo(this.jQ));
}
_ = OpenBoth.prototype = new MathCommand;
_.html_template = [
  '<span class="block intervalblock"></span>'
];
_.text_template = ['openBoth(',',',')'];
_.initBlocks = function(replacedFragment){
  var newBlock, first, second;
  this.firstChild = newBlock = first =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  var interval = this.jQ.append('<span class="' + this.cmd.substr(1) + ' interval block"></span>').find('.interval');
  newBlock.jQ = $('<span class="intervalelement"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(newBlock.jQ)
    .appendTo(interval);
  interval.append('<span class="intervalseparator">,</span>');
  first.next = newBlock = second = new MathBlock;
  newBlock.jQ = $('<span class="intervalelement"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(newBlock.jQ)
    .appendTo(interval);
  second.prev = first;
  this.lastChild = second;
  first.blur();
  second.blur();
  first.parent = second.parent = this;
}
_.redraw = Bracket.prototype.redraw;
LatexCmds.openBoth = OpenBoth;

function Closedinterval(replacedFragment){
  this.init('\\closed', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">[</span>').prependTo(this.jQ)
      .add($('<span class="paren">]</span>').appendTo(this.jQ));
}
_ = Closedinterval.prototype = new OpenBoth;
_.text_template = ['closed(',',',')'];
LatexCmds.closed = Closedinterval;

function OpenLeft(replacedFragment){
  this.init('\\openLeft', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">]</span>').prependTo(this.jQ)
      .add($('<span class="paren">]</span>').appendTo(this.jQ));
}
_ = OpenLeft.prototype = new OpenBoth;
_.text_template = ['openLeft(',',',')'];
LatexCmds.openLeft = OpenLeft;

function OpenRight(replacedFragment){
  this.init('\\openRight', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">[</span>').prependTo(this.jQ)
      .add($('<span class="paren">[</span>').appendTo(this.jQ));
}
_ = OpenRight.prototype = new OpenBoth;
_.text_template = ['openRight(',',',')'];
LatexCmds.openRight = OpenRight;

function Openleft(replacedFragment){
  this.init('\\openleft', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">(</span>').prependTo(this.jQ)
      .add($('<span class="paren">]</span>').appendTo(this.jQ));
}
_ = Openleft.prototype = new OpenBoth;
_.text_template = ['openleft(',',',')'];
LatexCmds.openleft = Openleft;

function Openright(replacedFragment){
  this.init('\\openright', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">[</span>').prependTo(this.jQ)
      .add($('<span class="paren">)</span>').appendTo(this.jQ));
}
_ = Openright.prototype = new OpenBoth;
_.text_template = ['openright(',',',')'];
LatexCmds.openright = Openright;

function Openboth(replacedFragment){
  this.init('\\openboth', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">(</span>').prependTo(this.jQ)
      .add($('<span class="paren">)</span>').appendTo(this.jQ));
}
_ = Openboth.prototype = new OpenBoth;
_.text_template = ['openboth(',',',')'];
LatexCmds.openboth = Openboth;

/***
 * Integral for E-Math
 ***/

function Integral(replacedFragment){
  this.init('\\Int', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children().eq(1);
}
_ = Integral.prototype = new MathCommand;
_.html_template = [
  '<span class="block integralblock"></span>'
];
_.text_template = ['Integral(',',',',',')'];
_.initBlocks = function(replacedFragment){
  this.blockjQ = this.jQ.children();
  console.log(this.blockjQ);
  this.bracketjQs =
    $('<span class="bigoperatorstack"><span><span class="bigoperator">&int;</span></span></span>').prependTo(this.jQ);
  this.bigoperatorjQ = this.bracketjQs.find('.bigoperator');
  var newBlock, intfrom, intto, integrand, intdx;
  intfrom = new MathBlock;
  intto = new MathBlock;
  intdx = new MathBlock;
  newBlock = integrand =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  var intblock = this.jQ.append('<span class="' + this.cmd.substr(1) + ' block"></span>').find('span:last');
  intfrom.jQ = $('<span class="integralfrom limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(intfrom.jQ)
    .appendTo(this.bracketjQs);
  intto.jQ = $('<span class="integralto limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(intto.jQ)
    .prependTo(this.bracketjQs);
  newBlock.jQ = $('<span class="integral"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(newBlock.jQ)
    .appendTo(intblock);
  intdx.jQ = $('<span class="integraldifferential"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(intdx.jQ)
    .appendTo(intblock);
  this.firstChild = intfrom;
  intfrom.next = intto;
  intto.prev = intfrom;
  intto.next = integrand;
  integrand.prev = intto;
  integrand.next = intdx;
  intdx.prev = integrand;
  this.lastChild = intdx;
  intfrom.blur();
  intto.blur();
  integrand.blur();
  intdx.blur();
  intfrom.parent = intto.parent = integrand.parent = intdx.parent = this;
}
_.redraw = Bracket.prototype.redraw;
_.redraw = function() {
  var outerheight = this.blockjQ.outerHeight();
  var height = outerheight/+this.blockjQ.css('fontSize').slice(0,-2);
  scale(this.bigoperatorjQ, min(1 + .2*(height - 1), 1.2), 0.95*height);
  this.bigoperatorjQ.css('line-height', outerheight+'px');
  this.bigoperatorjQ.parent().css('height', outerheight);
};
LatexCmds.Int = LatexCmds.Integral = Integral;

/***
 * Integral substitution: Finnish syntax for E-Math
 ***/

function IntegralSubst(replacedFragment){
  this.init('\\Intsubst', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children().eq(1);
}
_ = IntegralSubst.prototype = new MathCommand;
_.html_template = [
  '<span class="block integralblock"></span>'
];
_.text_template = ['Integralsubst(',',',')'];
_.initBlocks = function(replacedFragment){
  this.blockjQ = this.jQ.children();
  console.log(this.blockjQ);
  this.bracketjQs =
    $('<span class="bigoperatorstack"><span><span class="bigoperator">/</span></span></span>').prependTo(this.jQ);
  this.bigoperatorjQ = this.bracketjQs.find('.bigoperator');
  var newBlock, intfrom, intto, integrand, intdx;
  intfrom = new MathBlock;
  intto = new MathBlock;
  newBlock = integrand =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  var intblock = this.jQ.append('<span class="' + this.cmd.substr(1) + ' block"></span>').find('span:last');
  intfrom.jQ = $('<span class="integralfrom limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(intfrom.jQ)
    .appendTo(this.bracketjQs);
  intto.jQ = $('<span class="integralto limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(intto.jQ)
    .prependTo(this.bracketjQs);
  newBlock.jQ = $('<span class="integral"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(newBlock.jQ)
    .appendTo(intblock);
  this.firstChild = intfrom;
  intfrom.next = intto;
  intto.prev = intfrom;
  intto.next = integrand;
  integrand.prev = intto;
  this.lastChild = integrand;
  intfrom.blur();
  intto.blur();
  integrand.blur();
  intfrom.parent = intto.parent = integrand.parent = this;
}
_.redraw = Bracket.prototype.redraw;
_.redraw = function() {
  var outerheight = this.blockjQ.outerHeight();
  var height = outerheight/+this.blockjQ.css('fontSize').slice(0,-2);
  scale(this.bigoperatorjQ, min(1 + .2*(height - 1), 1.2), 0.95*height);
  this.bigoperatorjQ.css('line-height', outerheight+'px');
  this.bigoperatorjQ.parent().css('height', outerheight);
};
LatexCmds.Intsubst = LatexCmds.IntegralSubst = IntegralSubst;

/***
 * Display style sum for E-Math
 ***/

function BigSum(replacedFragment){
  this.init('\\Sum', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children().eq(1);
}
_ = BigSum.prototype = new MathCommand;
_.html_template = [
  '<span class="block opblock"></span>'
];
_.text_template = ['Sum(',',',')'];
_.initBlocks = function(replacedFragment){
  this.blockjQ = this.jQ.children();
  console.log(this.blockjQ);
  this.bracketjQs =
    $('<span class="bigoperatorstack"><span><span class="bigoperator">&Sigma;</span></span></span>').prependTo(this.jQ);
  this.bigoperatorjQ = this.bracketjQs.find('.bigoperator');
  var newBlock, opfrom, opto, expression;
  opfrom = new MathBlock;
  opto = new MathBlock;
  newBlock = expression =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  var opblock = this.jQ.append('<span class="bigopblock block"></span>').find('span:last');
  opfrom.jQ = $('<span class="opfrom limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(opfrom.jQ)
    .appendTo(this.bracketjQs);
  opto.jQ = $('<span class="opto limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(opto.jQ)
    .prependTo(this.bracketjQs);
  newBlock.jQ = $('<span class="opexpression"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(newBlock.jQ)
    .appendTo(opblock);
  this.firstChild = opfrom;
  opfrom.next = opto;
  opto.prev = opfrom;
  opto.next = expression;
  expression.prev = opto;
  this.lastChild = expression;
  opfrom.blur();
  opto.blur();
  expression.blur();
  opfrom.parent = opto.parent = expression.parent = this;
}
_.redraw = Bracket.prototype.redraw;
_.redraw = function() {
  var outerheight = this.blockjQ.outerHeight();
  var height = outerheight/+this.blockjQ.css('fontSize').slice(0,-2);
  scale(this.bigoperatorjQ, 0.95*height, 0.95*height);
  this.bigoperatorjQ.css('line-height', outerheight+'px');
  this.bigoperatorjQ.parent().css('height', outerheight);
};
LatexCmds.Sum = LatexCmds.BigSum = BigSum;

/***
 * Display style product for E-Math
 ***/

function BigProd(replacedFragment){
  this.init('\\Prod', undefined, undefined, replacedFragment);
  this.blockjQ = this.jQ.children().eq(1);
}
_ = BigProd.prototype = new MathCommand;
_.html_template = [
  '<span class="block opblock"></span>'
];
_.text_template = ['Product(',',',')'];
_.initBlocks = function(replacedFragment){
  this.blockjQ = this.jQ.children();
  console.log(this.blockjQ);
  this.bracketjQs =
    $('<span class="bigoperatorstack"><span><span class="bigoperator">&Pi;</span></span></span>').prependTo(this.jQ);
  this.bigoperatorjQ = this.bracketjQs.find('.bigoperator');
  var newBlock, opfrom, opto, expression;
  opfrom = new MathBlock;
  opto = new MathBlock;
  newBlock = expression =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  var opblock = this.jQ.append('<span class="bigopblock block"></span>').find('span:last');
  opfrom.jQ = $('<span class="opfrom limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(opfrom.jQ)
    .appendTo(this.bracketjQs);
  opto.jQ = $('<span class="opto limit"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(opto.jQ)
    .prependTo(this.bracketjQs);
  newBlock.jQ = $('<span class="opexpression"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .append(newBlock.jQ)
    .appendTo(opblock);
  this.firstChild = opfrom;
  opfrom.next = opto;
  opto.prev = opfrom;
  opto.next = expression;
  expression.prev = opto;
  this.lastChild = expression;
  opfrom.blur();
  opto.blur();
  expression.blur();
  opfrom.parent = opto.parent = expression.parent = this;
}
_.redraw = Bracket.prototype.redraw;
_.redraw = function() {
  var outerheight = this.blockjQ.outerHeight();
  var height = outerheight/+this.blockjQ.css('fontSize').slice(0,-2);
  scale(this.bigoperatorjQ, 0.95*height, 0.95*height);
  this.bigoperatorjQ.css('line-height', outerheight+'px');
  this.bigoperatorjQ.parent().css('height', outerheight);
};
LatexCmds.Prod = LatexCmds.BigProd = BigProd;


function TextBlock(replacedText) {
  if (replacedText instanceof MathFragment)
    this.replacedText = replacedText.remove().jQ.text();
  else if (typeof replacedText === 'string')
    this.replacedText = replacedText;

  this.init();
}
_ = TextBlock.prototype = new MathCommand;
_.cmd = '\\text';
_.html_template = ['<span class="text"></span>'];
_.text_template = ['"', '"'];
_.initBlocks = function() { //FIXME: another possible Law of Demeter violation, but this seems much cleaner, like it was supposed to be done this way
  this.firstChild =
  this.lastChild =
  this.jQ.data(jQueryDataKey).block = new InnerTextBlock;

  this.firstChild.parent = this;
  this.firstChild.jQ = this.jQ.append(this.firstChild.jQ);
};
_.placeCursor = function(cursor) { //TODO: this should be done in the constructor that's passed replacedFragment, but you need the cursor to create new characters and insert them
  (this.cursor = cursor).appendTo(this.firstChild);

  if (this.replacedText)
    for (var i = 0; i < this.replacedText.length; i += 1)
      this.write(this.replacedText.charAt(i));
};
_.write = function(ch) {
  this.cursor.insertNew(new VanillaSymbol(ch));
};
_.keydown = function(e) {
  //backspace and delete and ends of block don't unwrap
  if (!this.cursor.selection &&
    (
      (e.which === 8 && !this.cursor.prev) ||
      (e.which === 46 && !this.cursor.next)
    )
  ) {
    if (this.isEmpty())
      this.cursor.insertAfter(this);
    return false;
  }
  return this.parent.keydown(e);
};
_.textInput = function(ch) {
  this.cursor.deleteSelection();
  if (ch !== '$')
    this.write(ch);
  else if (this.isEmpty())
    this.cursor.insertAfter(this).backspace().insertNew(new VanillaSymbol('\\$','$'));
  else if (!this.cursor.next)
    this.cursor.insertAfter(this);
  else if (!this.cursor.prev)
    this.cursor.insertBefore(this);
  else { //split apart
    var next = new TextBlock(new MathFragment(this.firstChild, this.cursor.prev));
    next.placeCursor = function(cursor) { //FIXME HACK: pretend no prev so they don't get merged
      this.prev = 0;
      delete this.placeCursor;
      this.placeCursor(cursor);
    };
    next.firstChild.focus = function(){ return this; };
    this.cursor.insertAfter(this).insertNew(next);
    next.prev = this;
    this.cursor.insertBefore(next);
    delete next.firstChild.focus;
  }
};
function InnerTextBlock(){}
_ = InnerTextBlock.prototype = new MathBlock;
_.blur = function() {
  this.jQ.removeClass('hasCursor');
  if (this.isEmpty()) {
    var textblock = this.parent, cursor = textblock.cursor;
    if (cursor.parent === this)
      this.jQ.addClass('empty');
    else {
      cursor.hide();
      textblock.remove();
      if (cursor.next === textblock)
        cursor.next = textblock.next;
      else if (cursor.prev === textblock)
        cursor.prev = textblock.prev;

      cursor.show().redraw();
    }
  }
  return this;
};
_.focus = function() {
  MathBlock.prototype.focus.call(this);

  var textblock = this.parent;
  if (textblock.next.cmd === textblock.cmd) { //TODO: seems like there should be a better way to move MathElements around
    var innerblock = this,
      cursor = textblock.cursor,
      next = textblock.next.firstChild;

    next.eachChild(function(child){
      child.parent = innerblock;
      child.jQ.appendTo(innerblock.jQ);
    });

    if (this.lastChild)
      this.lastChild.next = next.firstChild;
    else
      this.firstChild = next.firstChild;

    next.firstChild.prev = this.lastChild;
    this.lastChild = next.lastChild;

    next.parent.remove();

    if (cursor.prev)
      cursor.insertAfter(cursor.prev);
    else
      cursor.prependTo(this);

    cursor.redraw();
  }
  else if (textblock.prev.cmd === textblock.cmd) {
    var cursor = textblock.cursor;
    if (cursor.prev)
      textblock.prev.firstChild.focus();
    else
      cursor.appendTo(textblock.prev.firstChild);
  }
  return this;
};

CharCmds.$ =
LatexCmds.text =
LatexCmds.textnormal =
LatexCmds.textrm =
LatexCmds.textup =
LatexCmds.textmd =
  TextBlock;

function makeTextBlock(latex, html) {
  function SomeTextBlock() {
    TextBlock.apply(this, arguments);
  }
  _ = SomeTextBlock.prototype = new TextBlock;
  _.cmd = latex;
  _.html_template = [ html ];

  return SomeTextBlock;
}

LatexCmds.em = LatexCmds.italic = LatexCmds.italics =
LatexCmds.emph = LatexCmds.textit = LatexCmds.textsl =
  makeTextBlock('\\textit', '<i class="text"></i>');
LatexCmds.strong = LatexCmds.bold = LatexCmds.textbf =
  makeTextBlock('\\textbf', '<b class="text"></b>');
LatexCmds.sf = LatexCmds.textsf =
  makeTextBlock('\\textsf', '<span class="sans-serif text"></span>');
LatexCmds.tt = LatexCmds.texttt =
  makeTextBlock('\\texttt', '<span class="monospace text"></span>');
LatexCmds.textsc =
  makeTextBlock('\\textsc', '<span style="font-variant:small-caps" class="text"></span>');
LatexCmds.uppercase =
  makeTextBlock('\\uppercase', '<span style="text-transform:uppercase" class="text"></span>');
LatexCmds.lowercase =
  makeTextBlock('\\lowercase', '<span style="text-transform:lowercase" class="text"></span>');

// input box to type a variety of LaTeX commands beginning with a backslash
function LatexCommandInput(replacedFragment) {
  this.init('\\');
  if (replacedFragment) {
    this.replacedFragment = replacedFragment.detach();
    this.isEmpty = function(){ return false; };
  }
}
_ = LatexCommandInput.prototype = new MathCommand;
_.html_template = ['<span class="latex-command-input">\\</span>'];
_.text_template = ['\\'];
_.placeCursor = function(cursor) { //TODO: better architecture, better place for this to be done, and more cleanly
  this.cursor = cursor.appendTo(this.firstChild);
  if (this.replacedFragment)
    this.jQ =
      this.jQ.add(this.replacedFragment.jQ.addClass('blur').bind(
        'mousedown mousemove', //FIXME: is monkey-patching the mousedown and mousemove handlers the right way to do this?
        function(e) {
          $(e.target = this.nextSibling).trigger(e);
          return false;
        }
      ).insertBefore(this.jQ));
};
_.latex = function() {
  return '\\' + this.firstChild.latex() + ' ';
};
_.keydown = function(e) {
  if (e.which === 9 || e.which === 13) { //tab or enter
    this.renderCommand();
    return false;
  }
  return this.parent.keydown(e);
};
_.textInput = function(ch) {
  if (ch.match(/[a-z:;,%&]/i)) {
    this.cursor.deleteSelection();
    this.cursor.insertNew(new VanillaSymbol(ch));
    return;
  }
  this.renderCommand();
  if (ch === ' ' || (ch === '\\' && this.firstChild.isEmpty()))
    return;

  this.cursor.parent.textInput(ch);
};
_.renderCommand = function() {
  this.jQ = this.jQ.last();
  this.remove();
  if (this.next)
    this.cursor.insertBefore(this.next);
  else
    this.cursor.appendTo(this.parent);

  var latex = this.firstChild.latex();
  if (latex)
    this.cursor.insertCmd(latex, this.replacedFragment);
  else {
    var cmd = new VanillaSymbol('\\backslash ','\\');
    this.cursor.insertNew(cmd);
    if (this.replacedFragment)
      this.replacedFragment.remove();
  }
};

CharCmds['\\'] = LatexCommandInput;
  
function Binomial(replacedFragment) {
  this.init('\\binom', undefined, undefined, replacedFragment);
  this.jQ.wrapInner('<span class="array"></span>');
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">(</span>').prependTo(this.jQ)
    .add( $('<span class="paren">)</span>').appendTo(this.jQ) );
}
_ = Binomial.prototype = new MathCommand;
_.html_template =
  ['<span class="block"></span>', '<span></span>', '<span></span>'];
_.text_template = ['choose(',',',')'];
_.redraw = Bracket.prototype.redraw;
LatexCmds.binom = LatexCmds.binomial = Binomial;

function Choose() {
  Binomial.apply(this, arguments);
}
_ = Choose.prototype = new Binomial;
_.placeCursor = LiveFraction.prototype.placeCursor;

LatexCmds.choose = Choose;
//// Pekasa added
function Functions(replacedFragment) {
  this.init('\\func', ['<span class="block functionsblock"></span>'], ['Functions(',',',')'], replacedFragment);
  this.blockjQ = this.jQ.children();
}
_ = Functions.prototype = new MathCommand;
_.initBlocks = function(replacedFragment){
  this.blockjQ = this.jQ.children();
  var newBlock, fname, fparams;
  fname = new MathBlock;
  newBlock = fparams =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  fname.jQ = $('<span class="funcname block"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .prependTo(this.jQ);
  fparams.jQ = $('<span class="funcparams block"></span>')
    .data(jQueryDataKey, {block: newBlock})
    .appendTo(this.jQ);
  this.firstChild = fname;
  fname.next = fparams;
  fparams.prev = fname;
  this.lastChild = fparams;
  this.bracketjQs =
    $('<span class="paren">(</span>').insertBefore(fparams.jQ)
    .add( $('<span class="paren">)</span>').insertAfter(fparams.jQ) );
  fname.blur();
  fparams.blur();
  fname.parent = fparams.parent = this;
}
_.redraw = Bracket.prototype.redraw;
_.redraw = function() {
  var outerheight = this.jQ.outerHeight();
  var height = outerheight/+this.blockjQ.css('fontSize').slice(0,-2);
  scale(this.bracketjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
};
LatexCmds.func = Functions;
//// Pesasa added \cases for E-math
function Cases(replacedFragment) {
  this.init('\\cases', undefined, undefined, replacedFragment);
  this.jQ.wrapInner('<span class="array"></span>');
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">{</span>').prependTo(this.jQ)
      .add( $('<span class="paren"></span>').appendTo(this.jQ) );
}
_ = Cases.prototype = new MathCommand;
_.html_template =
  ['<span class="block cases"></span>', '<span></span>', '<span></span>'];
_.text_template = ['case(',',',')'];
_.redraw = Bracket.prototype.redraw;
LatexCmds.cases = LatexCmds.cases = Cases;

function Case(replacedFragment, token, latex) {
  if (latex && latex[0] === '[') {
    latex.shift();
    var rows = '';
    while (/^[0-9]$/.test(latex[0])){
      rows += latex.shift();
    }
    rows = parseInt(rows);
    if (latex[0] === ']') {
      latex.shift();
    }
  }
  this.rowNum = rows || 1;
  this.editlock = false;
  this.init('\\case', undefined, undefined, replacedFragment);
  this.jQ.wrapInner('<span class="casebody"></span>');
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">{</span>').prependTo(this.jQ)
      .add( $('<span class="paren"></span>').appendTo(this.jQ));
}
_ = Case.prototype = new MathCommand;
_.html_template = ['<span class="block case"></span>'];
_.text_template = ['case(',',',')'];
_.redraw = Bracket.prototype.redraw;
_.initBlocks = function(replacedFragment) {
  var self = this;
  var newTermBlock, newExplBlock, prev;
  
  this.firstChild = newTermBlock =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  newExplBlock = new MathBlock;
  
  this.jQ.append('<span class="caserow"></span>');
  var crow = this.jQ.find('.caserow:last');
  newTermBlock.jQ = $('<span class="casecell"></span>')
    .data(jQueryDataKey, {block: newTermBlock})
    .append(newTermBlock.jQ)
    .appendTo(crow);
  newExplBlock.jQ = $('<span class="casecell caseexpl"></span>')
    .data(jQueryDataKey, {block: newExplBlock})
    .append(newExplBlock.jQ)
    .appendTo(crow);
  newTermBlock.next = newExplBlock;
  newExplBlock.prev = newTermBlock;
  this.lastChild = newExplBlock;
  newTermBlock.blur();
  newExplBlock.blur();
  newTermBlock.parent = newExplBlock.parent = self;
  
  for (var i = 1; i < this.rowNum; i++) {
    this.jQ.append('<span class="caserow"></span>');
    var crow = this.jQ.find('.caserow:last');
    newTermBlock = new MathBlock;
    newExplBlock = new MathBlock;
    newTermBlock.jQ = $('<span class="casecell"></span>')
      .data(jQueryDataKey, {block: newTermBlock})
      .append(newTermBlock.jQ)
      .appendTo(crow);
    newExplBlock.jQ = $('<span class="casecell caseexpl"></span>')
      .data(jQueryDataKey, {block: newExplBlock})
      .append(newExplBlock.jQ)
      .appendTo(crow);
    newTermBlock.next = newExplBlock;
    newExplBlock.prev = newTermBlock;
    this.lastChild.next = newTermBlock;
    newTermBlock.prev = this.lastChild;
    this.lastChild = newExplBlock;
    newTermBlock.blur();
    newExplBlock.blur();
    newTermBlock.parent = newExplBlock.parent = self;
  }
}
_.placeCursor = function(cursor) {
  this.cursor = cursor.appendTo(this.firstChild);
};
_.addRow = function() {
  if (this.editlock) {
    return false;
  } else {
    this.editlock = true;
  }
  var newrow = $('<span class="caserow"></span>');
  var row = $('.caserow:last', this.jQ);
  
  var newTermBlock = new MathBlock;
  var newExplBlock = new MathBlock;

  newTermBlock.parent = this;
  newExplBlock.parent = this;
  newTermBlock.jQ = $('<span class="casecell"></span>').data(jQueryDataKey, {block: newTermBlock}).appendTo(newrow);
  newExplBlock.jQ = $('<span class="casecell caseexpl"></span>').data(jQueryDataKey, {block: newExplBlock}).appendTo(newrow);
  this.lastChild.next = newTermBlock;
  newTermBlock.prev = this.lastChild;
  newTermBlock.next = newExplBlock;
  newExplBlock.prev = newTermBlock;
  this.lastChild = newExplBlock;
  this.cursor.appendTo(newTermBlock);
  this.cursor.appendTo(newExplBlock);

  row.after(newrow);
  this.cursor.appendTo(newTermBlock).redraw();
  this.rowNum++;
  this.editlock = false;
  return false;
}
_.removeRow = function() {
  if (this.rowNum === 1 || this.editlock) {
    return false;
  } else {
    this.editlock = true;
  }
  var row = $('.caserow:last', this.jQ);
  var curr = this.lastChild;
  var prev = curr.prev;
  for (var i = 0; i < 2; i++) {
    curr.next = null;
    curr.prev = null;
    curr.parent = null;
    curr.jQ.remove();
    curr = prev;
    curr.next = null;
    prev = curr.prev;
  }
  this.lastChild = curr;
  row.remove();
  this.rowNum--;
  this.cursor.appendTo(curr).redraw();
  this.editlock = false;
  return false;
}
_.keydown = function(e) {
  var currentBlock = this.cursor.parent;
  var self = this;
  if (currentBlock.parent === this) {
    if (e.which === 8) { //backspace
      if (currentBlock.isEmpty()) {
        if (currentBlock.prev) {
          this.cursor.appendTo(currentBlock.prev);
        } else {
          this.cursor.insertBefore(this);
        }
        return false;
      }
      else if (!this.cursor.prev)
        return false;
    } else if (e.which === 38 && e.ctrlKey) {
      return self.removeRow();
    } else if (e.which === 40 && e.ctrlKey) {
      return self.addRow();
    }
  }
  return this.parent.keydown(e);
};
_.latex = function() {
  var latex = this.cmd + '[' + this.rowNum + ']';
  var child = this.firstChild;
  latex += '{' + child.latex() + '}';
  while (child.next) {
    child = child.next;
    latex += '{' + child.latex() + '}';
  }
  return latex;
}
_.text = function() {
  var text = this.cmd.substr(1) + '(';
  var child = this.firstChild;
  var matrix = [];
  for (var i = 0; i < this.rowNum; i++) {
    var row = [];
    for (var j = 0; j < 2 && !!child; j++){
      row.push(child.text().toString());
      child = child.next;
    }
    matrix.push('[' + row.join(',') + ']');
  }
  text += '[' + matrix.join(',') +']' + ')';
  return text;
}
_.optional_arg_command = 'case';
LatexCmds.case = Case;

function Determ(replacedFragment, token, latex) {
  if (latex && latex[0] === '[') {
    latex.shift();
    var cols = '';
    var rows = '';
    while (/^[0-9]$/.test(latex[0])){
      cols += latex.shift();
    }
    cols = parseInt(cols);
    if (latex[0] === ',') {
      latex.shift();
      while (/^[0-9]$/.test(latex[0])){
        rows += latex.shift();
      }
      rows = parseInt(rows);
    } else {
      rows = cols;
    }
    if (latex[0] === ']') {
      latex.shift();
    }
  }
  this.colNum = cols || 1;
  this.rowNum = rows || 1;
  this.editlock = false;
  this.init('\\determ', undefined, undefined, replacedFragment);
  this.jQ.wrapInner('<span class="matrixbody"></span>');
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">|</span>').prependTo(this.jQ)
      .add( $('<span class="paren">|</span>').appendTo(this.jQ));
}
_ = Determ.prototype = new MathCommand;
_.html_template =
  ['<span class="block determ"></span>'];
_.text_template = ['determ(',',',',',',',')'];
_.redraw = Bracket.prototype.redraw;
_.initBlocks = function(replacedFragment){
  var self = this;
  
  var newBlock, prev;
  this.firstChild = newBlock = prev =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  var firstDone = false;
  
  for (var i = 0; i < this.rowNum; i++) {
    this.jQ.append('<span class="matrixrow"></span>');
    var mrow = this.jQ.find('.matrixrow:last');
    for (var j = 0; j < this.colNum; j++) {
      if (!firstDone) {
        firstDone = true;
        newBlock.jQ = $('<span class="matrixcell"></span>')
          .data(jQueryDataKey, {block: newBlock})
          .append(newBlock.jQ)
          .appendTo(mrow);
        this.lastChild = newBlock;
        newBlock.blur();
        newBlock.parent = self;
      } else {
        newBlock = new MathBlock;
        newBlock.jQ = $('<span class="matrixcell"></span>')
          .data(jQueryDataKey, {block: newBlock})
          .append(newBlock.jQ)
          .appendTo(mrow);
        newBlock.prev = this.lastChild;
        newBlock.prev.next = newBlock;
        this.lastChild = newBlock;
        newBlock.blur();
        newBlock.parent = self;
      }
    }
  }
}
_.placeCursor = function(cursor) {
  this.cursor = cursor.appendTo(this.firstChild);
};
_.addRow = function() {
  if (this.editlock) {
    return false;
  } else {
    this.editlock = true;
  }
  var newrow = $('<span class="matrixrow"></span>');
  var row = $('.matrixrow:last', this.jQ);
  var cb;
  
  for (var i = 0; i < this.colNum; i++) {
    var newBlock = new MathBlock;
    cb = cb || newBlock;
    newBlock.parent = this;
    newBlock.jQ = $('<span class="matrixcell"></span>').data(jQueryDataKey, {block: newBlock}).appendTo(newrow);
    newBlock.prev = this.lastChild;
    this.lastChild.next = newBlock;
    newBlock.next = null;
    this.lastChild = newBlock;
    this.cursor.appendTo(newBlock);
  }
  row.after(newrow);
  this.cursor.appendTo(cb).redraw();
  this.rowNum++;
  this.editlock = false;
  return false;
}
_.addCol = function(){
  if (this.editlock) {
    return false;
  } else {
    this.editlock = true;
  }
  var curr = this.firstChild;
  var rows = $('.matrixrow', this.jQ);
  var cb;
  for (var i = 0; i < this.rowNum; i++) {
    for (var j = 1; j < this.colNum; j++) {
      curr = curr.next;
    }
    var newBlock = new MathBlock;
    cb = cb || newBlock;
    newBlock.parent = this;
    newBlock.jQ = $('<span class="matrixcell"></span>').data(jQueryDataKey, {block: newBlock}).appendTo(rows.eq(i));
    newBlock.prev = curr;
    newBlock.next = curr.next;
    curr.next = newBlock;
    if (newBlock.next) {
      newBlock.next.prev = newBlock;
      curr = newBlock.next;
    } else {
      this.lastChild = newBlock;
    }
    this.cursor.appendTo(newBlock).redraw();
    this.cursor.appendTo(cb).redraw();
  }
  this.colNum++;
  this.editlock = false;
  return false;
}
_.removeRow = function() {
  if (this.rowNum === 1 || this.editlock) {
    return false;
  } else {
    this.editlock = true;
  }
  var row = $('.matrixrow:last', this.jQ);
  var curr = this.lastChild;
  var prev = curr.prev;
  for (var i = 0; i < this.colNum; i++) {
    curr.next = null;
    curr.prev = null;
    curr.parent = null;
    curr.jQ.remove();
    curr = prev;
    curr.next = null;
    prev = curr.prev;
  }
  this.lastChild = curr;
  row.remove();
  this.rowNum--;
  this.cursor.appendTo(curr).redraw();
  this.editlock = false;
  return false;
}
_.removeCol = function() {
  if (this.colNum === 1 || this.editlock) {
    return false;
  } else {
    this.editlock = true;
  }
  var curr = this.firstChild;
  var prev;
  for (var i = 0; i < this.rowNum; i++) {
    for (var j = 1; j < this.colNum; j++){
      prev = curr;
      curr = curr.next;
    }
    prev.next = curr.next;
    if (curr.next) {
      curr.next.prev = prev;
    }
    curr.prev = null;
    curr.next = null;
    curr.parent = null;
    curr.jQ.remove();
    curr = prev.next;
  }
  curr = prev;
  this.lastChild = curr;
  this.cursor.appendTo(curr).redraw();
  this.colNum--;
  this.editlock = false;
  return false;
}
_.keydown = function(e) {
  var currentBlock = this.cursor.parent;
  var self = this;
  if (currentBlock.parent === this) {
    if (e.which === 8) { //backspace
      if (currentBlock.isEmpty()) {
        if (currentBlock.prev) {
          this.cursor.appendTo(currentBlock.prev);
        } else {
          this.cursor.insertBefore(this);
        }
        return false;
      }
      else if (!this.cursor.prev)
        return false;
    } else if (e.which === 37 && e.ctrlKey) {
      return self.removeCol();
    } else if (e.which === 38 && e.ctrlKey) {
      return self.removeRow();
    } else if (e.which === 39 && e.ctrlKey) {
      return self.addCol();
    } else if (e.which === 40 && e.ctrlKey) {
      return self.addRow();
    }
  }
  return this.parent.keydown(e);
};
_.latex = function() {
  var latex = this.cmd + '[' + this.colNum + ',' + this.rowNum + ']';
  var child = this.firstChild;
  latex += '{' + child.latex() + '}';
  while (child.next) {
    child = child.next;
    latex += '{' + child.latex() + '}';
  }
  return latex;
}
_.text = function() {
  var text = this.cmd.substr(1) + '(';
  var child = this.firstChild;
  var matrix = [];
  for (var i = 0; i < this.rowNum; i++) {
    var row = [];
    for (var j = 0; j < this.colNum && !!child; j++){
      row.push(child.text().toString());
      child = child.next;
    }
    matrix.push('[' + row.join(',') + ']');
  }
  text += '[' + matrix.join(',') +']' + ')';
  return text;
}
_.optional_arg_command = 'determ';
LatexCmds.determ = Determ;

function Matrix(replacedFragment, token, latex) {
  if (latex && latex[0] === '[') {
    latex.shift();
    var cols = '';
    var rows = '';
    while (/^[0-9]$/.test(latex[0])){
      cols += latex.shift();
    }
    cols = parseInt(cols);
    if (latex[0] === ',') {
      latex.shift();
      while (/^[0-9]$/.test(latex[0])){
        rows += latex.shift();
      }
      rows = parseInt(rows);
    } else {
      rows = cols;
    }
    if (latex[0] === ']') {
      latex.shift();
    }
  }
  this.colNum = cols || 1;
  this.rowNum = rows || 1;
  this.init('\\matrix', undefined, undefined, replacedFragment);
  this.jQ.wrapInner('<span class="matrixbody"></span>');
  this.blockjQ = this.jQ.children();
  this.bracketjQs =
    $('<span class="paren">(</span>').prependTo(this.jQ)
      .add( $('<span class="paren">)</span>').appendTo(this.jQ));
}
_ = Matrix.prototype = new Determ;
_.html_template =
  ['<span class="block matrix"></span>'];
_.text_template = ['matrix(',',',',',',',')'];
_.optional_arg_command = 'matrix';
LatexCmds.matrix = Matrix;

function Vector(replacedFragment) {
  this.init('\\vector', undefined, undefined, replacedFragment);
}
_ = Vector.prototype = new MathCommand;
_.html_template = ['<span class="array"></span>', '<span></span>'];
_.latex = function() {
  return '\\begin{matrix}' + this.foldChildren([], function(latex, child) {
    latex.push(child.latex());
    return latex;
  }).join('\\\\') + '\\end{matrix}';
};
_.text = function() {
  return '[' + this.foldChildren([], function(text, child) {
    text.push(child.text());
    return text;
  }).join() + ']';
}
_.placeCursor = function(cursor) {
  this.cursor = cursor.appendTo(this.firstChild);
};
_.keydown = function(e) {
  var currentBlock = this.cursor.parent;

  if (currentBlock.parent === this) {
    if (e.which === 13) { //enter
      var newBlock = new MathBlock;
      newBlock.parent = this;
      newBlock.jQ = $('<span></span>')
        .data(jQueryDataKey, {block: newBlock})
        .insertAfter(currentBlock.jQ);
      if (currentBlock.next)
        currentBlock.next.prev = newBlock;
      else
        this.lastChild = newBlock;

      newBlock.next = currentBlock.next;
      currentBlock.next = newBlock;
      newBlock.prev = currentBlock;
      this.cursor.appendTo(newBlock).redraw();
      return false;
    }
    else if (e.which === 9 && !e.shiftKey && !currentBlock.next) { //tab
      if (currentBlock.isEmpty()) {
        if (currentBlock.prev) {
          this.cursor.insertAfter(this);
          delete currentBlock.prev.next;
          this.lastChild = currentBlock.prev;
          currentBlock.jQ.remove();
          this.cursor.redraw();
          return false;
        }
        else
          return this.parent.keydown(e);
      }

      var newBlock = new MathBlock;
      newBlock.parent = this;
      newBlock.jQ = $('<span></span>').data(jQueryDataKey, {block: newBlock}).appendTo(this.jQ);
      this.lastChild = newBlock;
      currentBlock.next = newBlock;
      newBlock.prev = currentBlock;
      this.cursor.appendTo(newBlock).redraw();
      return false;
    }
    else if (e.which === 8) { //backspace
      if (currentBlock.isEmpty()) {
        if (currentBlock.prev) {
          this.cursor.appendTo(currentBlock.prev)
          currentBlock.prev.next = currentBlock.next;
        }
        else {
          this.cursor.insertBefore(this);
          this.firstChild = currentBlock.next;
        }

        if (currentBlock.next)
          currentBlock.next.prev = currentBlock.prev;
        else
          this.lastChild = currentBlock.prev;

        currentBlock.jQ.remove();
        if (this.isEmpty())
          this.cursor.deleteForward();
        else
          this.cursor.redraw();

        return false;
      }
      else if (!this.cursor.prev)
        return false;
    }
  }
  return this.parent.keydown(e);
};

LatexCmds.vector = Vector;

LatexCmds.editable = proto(RootMathCommand, function() {
  this.init('\\editable');
  createRoot(this.jQ, this.firstChild, false, true);
  var cursor;
  this.placeCursor = function(c) { cursor = c.appendTo(this.firstChild); };
  this.firstChild.blur = function() {
    if (cursor.prev !== this.parent) return; //when cursor is inserted after editable, append own cursor FIXME HACK
    delete this.blur;
    this.cursor.appendTo(this);
    MathBlock.prototype.blur.call(this);
  };
  this.latex = function(){ return this.firstChild.latex(); };
  this.text = function(){ return this.firstChild.text(); };
});

