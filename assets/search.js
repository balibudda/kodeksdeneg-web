// Клиентский поиск по ситуации. Индекс — /search-index.json (создаётся при сборке).
// Устойчив к падежам и формам слова (лёгкий стеммер) и к разговорным
// формулировкам (словарь синонимов). Работает офлайн.
(function () {
  var input = document.getElementById('q')
  var out = document.getElementById('results')
  if (!input || !out) return

  var INDEX = []
  var ready = false

  // разговорное / формы → к стеммам из контента
  var SYN = {
    'пристав': 'пристав взыскан спис арест',
    'списал': 'спис пристав арест',
    'арестовал': 'арест пристав имуществ',
    'коллектор': 'коллектор звон',
    'звонят': 'коллектор звон',
    'звонит': 'коллектор звон мошенник',
    'должник': 'долг взыскан',
    'займ': 'займ мфо микрозайм займ',
    'займы': 'займ мфо микрозайм',
    'микрозайм': 'займ мфо',
    'мфо': 'займ микрозайм',
    'кредит': 'кредит займ банк',
    'кредитка': 'кредитн карт',
    'банкрот': 'банкротств спис',
    'банкротство': 'банкротств спис',
    'мошенник': 'мошенничеств обман развод',
    'мошенники': 'мошенничеств обман развод',
    'обманули': 'мошенничеств обман',
    'развели': 'мошенничеств обман',
    'ипотека': 'ипотек жиль',
    'алименты': 'алимент',
    'зарплата': 'зарплат доход работ',
    'зарплату': 'зарплат доход',
    'уволили': 'сокращен увольнен работ',
    'уволят': 'сокращен увольнен работ',
    'аренда': 'аренд квартир найм',
    'квартира': 'аренд квартир жиль ипотек',
    'депозит': 'залог аренд',
    'залог': 'залог аренд',
    'дтп': 'авари осаго каршеринг',
    'авария': 'авари осаго дтп каршеринг',
    'страховка': 'страхован',
    'пенсия': 'пенси накоплен',
    'инвалидность': 'инвалидн льгот мсэ',
    'больничный': 'больничн',
    'наследство': 'наследств',
    'умер': 'наследств',
    'развод': 'развод раздел имуществ',
    'штраф': 'штраф гибдд',
    'самозанятый': 'самозанят',
    'подписки': 'подписк автоплатеж',
    'кэшбэк': 'кешбек лояльност',
    'кешбек': 'кешбек лояльност',
    'госуслуги': 'госуслуг',
    'сво': 'сво военнослужащ мобилизован',
    'работа': 'работ труд зарплат',
    'вычет': 'вычет налог',
    'налоги': 'налог',
    'дети': 'ребен маткапитал алимент',
    'ребенок': 'ребен маткапитал алимент',
    'машина': 'авто транспорт каршеринг',
    'авто': 'авто транспорт машин',
  }

  var ENDINGS = [
    'ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ах', 'ях',
    'ов', 'ев', 'ий', 'ый', 'ой', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие',
    'ам', 'ям', 'ом', 'ем', 'ым', 'им', 'их', 'ых', 'ешь', 'ет', 'ут',
    'ют', 'ат', 'ят', 'ла', 'ло', 'ли', 'на', 'но', 'ны',
    'а', 'я', 'о', 'е', 'у', 'ю', 'ы', 'и', 'й', 'ь',
  ]

  function norm(s) {
    return (s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9 ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function stem(w) {
    if (w.length <= 4) return w
    for (var i = 0; i < ENDINGS.length; i++) {
      var e = ENDINGS[i]
      if (w.length - e.length >= 4 && w.slice(-e.length) === e) return w.slice(0, -e.length)
    }
    return w
  }

  function tokens(s) {
    return norm(s).split(' ').filter(Boolean).map(stem)
  }

  function expand(q) {
    var base = norm(q)
    var out = tokens(q)
    for (var k in SYN) {
      if (base.indexOf(k) !== -1) out = out.concat(tokens(SYN[k]))
    }
    var seen = {}
    return out.filter(function (t) {
      if (t.length < 3 || seen[t]) return false
      seen[t] = 1
      return true
    })
  }

  function fieldHit(fieldTokens, fieldStr, term) {
    for (var i = 0; i < fieldTokens.length; i++) {
      if (fieldTokens[i] === term) return 2
      if (fieldTokens[i].indexOf(term) === 0 || term.indexOf(fieldTokens[i]) === 0) return 1
    }
    if (term.length >= 4 && fieldStr.indexOf(term) !== -1) return 1
    return 0
  }

  function score(item, terms) {
    var sc = 0
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i]
      sc += 10 * fieldHit(item._t, item._ts, term)
      sc += 6 * fieldHit(item._k, item._ks, term)
      sc += 4 * fieldHit(item._d, item._ds, term)
      sc += 1 * fieldHit(item._x, item._xs, term)
      sc += 2 * fieldHit(item._s, item._ss, term)
    }
    return sc
  }

  function prep(data) {
    return data.map(function (it) {
      it._t = tokens(it.t); it._ts = norm(it.t)
      it._k = tokens(it.k); it._ks = norm(it.k)
      it._d = tokens(it.d); it._ds = norm(it.d)
      it._s = tokens(it.s); it._ss = norm(it.s)
      it._x = tokens(it.x); it._xs = norm(it.x)
      return it
    })
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function run() {
    var q = input.value.trim()
    if (!ready) {
      out.innerHTML = '<li class="search-empty">Загрузка…</li>'
      return
    }
    if (q.length < 2) {
      out.innerHTML = ''
      return
    }
    var terms = expand(q)
    var ranked = INDEX.map(function (it) { return { it: it, sc: score(it, terms) } })
      .filter(function (r) { return r.sc > 0 })
      .sort(function (a, b) { return b.sc - a.sc })
      .slice(0, 20)

    if (!ranked.length) {
      var subj = encodeURIComponent('Вопрос с сайта: ' + q)
      var body = encodeURIComponent(
        'Здравствуйте! Не нашёл(-ла) на сайте ответ по теме: «' + q + '».\n\nВопрос: \n\n(Если хотите получить ответ, оставьте, пожалуйста, тут же обратный адрес или контакт для связи.)',
      )
      out.innerHTML =
        '<li class="search-empty">Ничего не нашлось. Попробуйте другими словами (например «приставы», «коллекторы», «займы», «мошенники») или откройте <a href="/">разделы</a> либо <a href="/vse-temy/">все темы</a>.' +
        '<div class="ask-question"><p><b>Не нашли ответ на свой вопрос?</b> Задайте его — мы постараемся сформулировать ответ и добавить тему на сайт.</p>' +
        '<a class="btn btn-ghost" href="mailto:info@kodeksdeneg.ru?subject=' + subj + '&body=' + body + '">✉️ Задать вопрос</a></div></li>'
      return
    }
    out.innerHTML = ranked
      .map(function (r) {
        var it = r.it
        return (
          '<li><a href="' + it.u + '">' +
          '<span class="r-title">' + escapeHtml(it.t) + '</span>' +
          '<span class="r-sec">' + escapeHtml(it.s) + '</span>' +
          '<span class="r-desc">' + escapeHtml(it.d) + '</span>' +
          '</a></li>'
        )
      })
      .join('')
  }

  fetch('/search-index.json')
    .then(function (r) { return r.json() })
    .then(function (data) {
      INDEX = prep(data)
      ready = true
      run()
    })
    .catch(function () {
      out.innerHTML = '<li class="search-empty">Не удалось загрузить поиск. Откройте <a href="/">разделы</a>.</li>'
    })

  var t
  input.addEventListener('input', function () {
    clearTimeout(t)
    t = setTimeout(run, 110)
  })

  var pre = new URLSearchParams(location.search).get('q')
  if (pre) {
    input.value = pre
    run()
  }
})()
