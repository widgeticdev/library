const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const { assert } = require('chai')

describe('HTML processing', () => {
  before(function () {
    const formatter = require('../../server/formatter')
    this.rawHTML = fs.readFileSync(path.join(__dirname, '../fixtures/supportedFormats.html'), { encoding: 'utf8' })
    this.processedHTML = formatter.getProcessedHtml(this.rawHTML)
    this.output = cheerio.load(this.processedHTML)
  })

  it('strips unnecessary styles', function () {
    const header = this.output('h2')
    assert.equal(null, header.attr('style'))
  })

  it('strips unnecessary &nbsp;s', function () {
    const introHTML = this.output("p:contains('Basic text format')").html()
    assert.match(introHTML, /Text color and highlighting/)
  })

  describe('inline formats', () => {
    it('preserves bolds', function () {
      const boldSpan = this.output("span:contains('bold')").first()
      assert.equal('font-weight:700', boldSpan.attr('style'))
    })

    it('preserves italics', function () {
      const italicSpan = this.output("span:contains('italic')").first()
      assert.equal('font-style:italic', italicSpan.attr('style'))
    })

    it('preserves underlines', function () {
      const underlinedSpan = this.output("span:contains('underline')").first()
      assert.equal('text-decoration:underline', underlinedSpan.attr('style'))
    })

    it('preserves combined formats', function () {
      const combinedSpan = this.output("span:contains('combined')").first()
      assert.equal('font-style:italic;font-weight:700;text-decoration:underline', combinedSpan.attr('style'))
    })

    it('preserves image widths', function () {
      const imageWidth = this.output('img').first()
      const widthMatch = imageWidth.attr('style').match('width')
      assert.isNotNull(widthMatch)
    })
  })

  describe('list handling', () => {
    it('preserves classing on lists', function () {
      const ol = this.output('ol').first()
      assert.match(ol.attr('class'), /lst-/)
    })

    it('presrves the associated style block for lists', function () {
      const olClass = this.output('ol').first().attr('class').split(' ')[0]
      assert.match(this.processedHTML, new RegExp(`ol.${olClass} {`))
    })

    it('applies a level- class on lists to support indentation', function () {
      const topLevelList = this.output("ul:contains('Item 1')").first()
      assert.match(topLevelList.attr('class'), / level-0/)

      const nestedList = this.output("ul:contains('Item 1.1')").first()
      assert.match(nestedList.attr('class'), / level-1/)
    })
  })

  describe('code block handling', () => {
    it('allows &nbsp; as part of a code block', function () {
      const codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /&amp;nbsp/)
    })

    it('preserves whitespace at the start of a line', function () {
      const codeBlock = this.output('pre')
      assert.match(codeBlock.html(), / +jQuery.fn.calcSubWidth/)
    })

    it('scrubs smart quotes', function () {
      const codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /singleQuotedStr = &apos;str&apos;/)
      assert.match(codeBlock.html(), /doubleQuotedStr = &quot;str&quot;/)
    })
  })

  describe('comment handling', () => {
    it('strips comments', function () {
      assert.notMatch(this.processedHTML, /This comment text will not appear/)
    })

    it('strips inline comment anchors', function () {
      const commentAnchorParent = this.output("p:contains('will be stripped from the')")
      assert.notMatch(commentAnchorParent, /\[a\]/)
    })
  })
})
