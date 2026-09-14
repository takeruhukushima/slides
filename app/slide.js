// Lightweight slide engine. Injected inline (see _renderer.tsx) on pages with
// `slide: true` in frontmatter. Splits the rendered body into slides and adds
// keyboard / click navigation. Plain browser JS (no build transform).
;(function () {
  var root = document.getElementById('slides')
  if (!root) return
  var nodes = Array.prototype.slice.call(root.childNodes)

  function isMeaningful(node) {
    return node.nodeType !== 3 || node.textContent.trim().length > 0
  }
  function isHr(n) {
    return n.tagName === 'HR'
  }
  function beforeHeading(n) {
    return n.tagName === 'H1' || n.tagName === 'H2'
  }
  function splitOn(test) {
    var groups = []
    var current = document.createElement('section')
    current.className = 'slide'
    function flush() {
      for (var i = 0; i < current.childNodes.length; i++) {
        if (isMeaningful(current.childNodes[i])) {
          groups.push(current)
          return
        }
      }
    }
    nodes.forEach(function (node) {
      if (node.nodeType === 1 && test(node)) {
        flush()
        current = document.createElement('section')
        current.className = 'slide'
        if (test === beforeHeading) current.appendChild(node)
      } else {
        current.appendChild(node.cloneNode(true))
      }
    })
    flush()
    return groups
  }

  var slides = splitOn(isHr)
  // Fallback: no '---' separators -> split before each H1/H2 heading
  if (slides.length < 2) slides = splitOn(beforeHeading)

  // Slidev-style columns: a `::right::` marker splits a slide into two columns.
  // A leading heading stays full-width on top (like slidev's two-cols-header).
  function isColumnMarker(n) {
    if (n.nodeType !== 1 || n.tagName !== 'P') return false
    var t = n.textContent.trim()
    return t === '::right::' || t === ':::'
  }
  function applyColumns(slide) {
    var kids = Array.prototype.slice.call(slide.childNodes)
    var markerIdx = -1
    for (var i = 0; i < kids.length; i++) {
      if (isColumnMarker(kids[i])) {
        markerIdx = i
        break
      }
    }
    if (markerIdx === -1) return
    var cols = document.createElement('div')
    cols.className = 'cols'
    var left = document.createElement('div')
    var right = document.createElement('div')
    cols.appendChild(left)
    cols.appendChild(right)
    kids.forEach(function (n, i) {
      if (i === markerIdx) return // drop the marker itself
      ;(i < markerIdx ? left : right).appendChild(n)
    })
    slide.innerHTML = ''
    // Lift a leading heading out of the left column to span the full width.
    var first = left.firstElementChild
    if (first && /^H[1-3]$/.test(first.tagName)) slide.appendChild(first)
    slide.appendChild(cols)
  }
  slides.forEach(applyColumns)

  root.innerHTML = ''
  slides.forEach(function (s) {
    root.appendChild(s)
  })

  // Add a copy button to every code block.
  Array.prototype.forEach.call(root.querySelectorAll('pre'), function (pre) {
    var code = pre.querySelector('code') || pre
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'copy-btn'
    btn.textContent = 'Copy'
    btn.addEventListener('click', function () {
      var text = code.innerText
      var done = function () {
        btn.textContent = 'Copied!'
        btn.classList.add('copied')
        setTimeout(function () {
          btn.textContent = 'Copy'
          btn.classList.remove('copied')
        }, 1200)
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done)
      } else {
        var ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
        } catch (e) {}
        document.body.removeChild(ta)
        done()
      }
    })
    pre.appendChild(btn)
  })

  // --- Mol* protein viewer -------------------------------------------------
  // Chimera-class rendering (high-quality cartoons, surfaces, ambient
  // occlusion) via the Mol* engine — the same one RCSB's site uses. The
  // library is loaded from a CDN in _renderer.tsx; here we just spin up a
  // viewport in each placeholder div and load a structure straight from RCSB.
  // Markup: <div class="molstar-viewer" data-pdb="1CRN" data-preset="cartoon">.
  var molstarViewers = []
  function initMolstar(el) {
    var id = (el.getAttribute('data-pdb') || '').toUpperCase()
    el.textContent = '' // clear the "Loading…" fallback text
    window.molstar.Viewer.create(el, {
      layoutIsExpanded: false,
      layoutShowControls: false,
      layoutShowSequence: false,
      layoutShowLog: false,
      layoutShowLeftPanel: false,
      viewportShowExpand: false,
      viewportShowSelectionMode: false,
      viewportShowAnimation: false,
      viewportShowControls: false,
      pdbProvider: 'rcsb',
      pixelScale: window.devicePixelRatio || 1
    }).then(function (viewer) {
      molstarViewers.push(viewer)
      // Default auto preset: high-quality cartoon + ligands (ball-and-stick).
      return viewer.loadPdb(id)
    }).catch(function () {
      el.textContent = 'Failed to load ' + id
    })
  }
  if (window.molstar && window.molstar.Viewer) {
    Array.prototype.forEach.call(
      root.querySelectorAll('.molstar-viewer'),
      initMolstar
    )
  }

  // --- VexFlow: staff notation with the Bravura font -----------------------
  // Renders key signatures / scales on a five-line staff. VexFlow 4 ships the
  // Bravura glyph outlines embedded (no webfont needed) and draws to inline
  // SVG. Markup: <div class="vf-stave" data-key="G" data-clef="treble"
  //   data-scale="g/4,a/4,..." data-width="150">. The library is loaded on
  // demand from a CDN only when a page actually contains staves.
  function drawStaves() {
    if (!window.Vex) return
    var VF = window.Vex.Flow
    Array.prototype.forEach.call(root.querySelectorAll('.vf-stave'), function (el) {
      if (el.getAttribute('data-drawn')) return
      el.setAttribute('data-drawn', '1')
      el.textContent = ''
      try {
        var key = el.getAttribute('data-key') || ''
        var clef = el.getAttribute('data-clef') || 'treble'
        var scale = el.getAttribute('data-scale')
        var w = parseInt(el.getAttribute('data-width') || '', 10) || (scale ? 380 : 150)
        var h = parseInt(el.getAttribute('data-height') || '', 10) || 96
        var renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG)
        renderer.resize(w, h)
        var ctx = renderer.getContext()
        var stave = new VF.Stave(1, 6, w - 2, {
          space_above_staff_ln: 1,
          space_below_staff_ln: 1
        })
        stave.addClef(clef)
        if (key) stave.addKeySignature(key)
        stave.setContext(ctx).draw()
        if (scale) {
          var notes = scale.split(',').map(function (k) {
            return new VF.StaveNote({ clef: clef, keys: [k.trim()], duration: 'q' })
          })
          var voice = new VF.Voice({ num_beats: notes.length, beat_value: 4 })
            .setStrict(false)
            .addTickables(notes)
          // Hide accidentals already implied by the key signature.
          VF.Accidental.applyAccidentals([voice], key || 'C')
          new VF.Formatter().joinVoices([voice]).format([voice], w - stave.getNoteStartX() - 20)
          voice.draw(ctx, stave)
        }
      } catch (e) {
        el.textContent = '楽譜の描画に失敗'
      }
    })
  }
  if (root.querySelector('.vf-stave')) {
    if (window.Vex) {
      drawStaves()
    } else {
      var vf = document.createElement('script')
      vf.src = 'https://cdn.jsdelivr.net/npm/vexflow@4.2.4/build/cjs/vexflow.js'
      vf.onload = drawStaves
      document.head.appendChild(vf)
    }
  }

  var idx = 0
  var counter = document.getElementById('counter')
  var progress = document.getElementById('progress')

  function render() {
    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === idx)
    })
    counter.textContent = idx + 1 + ' / ' + slides.length
    progress.style.width = ((idx + 1) / slides.length) * 100 + '%'
    var active = slides[idx]
    if (active) active.scrollTop = 0
    // A Mol* viewport initialised while its slide was display:none starts at
    // zero size; nudge it to re-fit once the slide is visible.
    if (molstarViewers.length) {
      requestAnimationFrame(function () {
        window.dispatchEvent(new Event('resize'))
        molstarViewers.forEach(function (v) {
          try { v.handleResize() } catch (e) {}
        })
      })
    }
  }
  function clamp(n) {
    return Math.max(0, Math.min(slides.length - 1, n))
  }
  // Push a history entry so the browser back/forward buttons move between slides.
  function go(n) {
    var next = clamp(n)
    if (next === idx) return
    idx = next
    render()
    history.pushState(null, '', '#' + (idx + 1))
  }
  window.addEventListener('popstate', function () {
    var h = parseInt((location.hash || '').replace('#', ''), 10)
    idx = h ? clamp(h - 1) : 0
    render()
  })

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].indexOf(e.key) > -1) {
      go(idx + 1)
      e.preventDefault()
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) > -1) {
      go(idx - 1)
      e.preventDefault()
    } else if (e.key === 'Home') {
      go(0)
    } else if (e.key === 'End') {
      go(slides.length - 1)
    } else if (e.key === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen()
      else document.exitFullscreen()
    }
  })

  // Touch swipe navigation for mobile (horizontal flick only, so vertical
  // scrolling of tall slides is unaffected).
  var touchX = null
  var touchY = null
  root.addEventListener(
    'touchstart',
    function (e) {
      if (e.touches.length !== 1) {
        touchX = null
        return
      }
      touchX = e.touches[0].clientX
      touchY = e.touches[0].clientY
    },
    { passive: true }
  )
  root.addEventListener(
    'touchend',
    function (e) {
      if (touchX === null) return
      var t = e.changedTouches[0]
      var dx = t.clientX - touchX
      var dy = t.clientY - touchY
      touchX = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        go(dx < 0 ? idx + 1 : idx - 1)
      }
    },
    { passive: true }
  )

  var h = parseInt((location.hash || '').replace('#', ''), 10)
  if (h) idx = clamp(h - 1)
  render()
  history.replaceState(null, '', '#' + (idx + 1))
  if (window.hljs) window.hljs.highlightAll()
})()
