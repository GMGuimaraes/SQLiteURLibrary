var constants = {
    'mybookmarks':'mybookmarks',
    'DAY_AS_MILLISECONDS':1000 * 60 * 60 * 24
}
var db

function exportSQLite(db) {
    var bin2String = function(array) {
        return String.fromCharCode.apply(String, array)
    }

    return simpleStorage.set(constants.mybookmarks, bin2String(db.export()))
        /* true, false, or error object, according to API docs */
}

function importLocalStorage() {
    var string2Bin = function(str) {
        return str.split("").map(function(val) {
            return val.charCodeAt(0)
        })
    }
    var datastring = simpleStorage.get(constants.mybookmarks)

    return ('undefined' === typeof datastring ? datastring : string2Bin(datastring))
        /* either undefined or array of binary */
} // importLocalStorage

function createDB() {
    if (!simpleStorage.canUse())
        throw { name:'BookmarkException', msg:'local storage not an option' }

    var db = new SQL.Database()

    db.run('CREATE TABLE bookmarks (url TEXT UNIQUE PRIMARY KEY NOT NULL, \
        creationDate INTEGER, \
        tags TEXT, \
        expirationDate INTEGER);')
    db.run('CREATE INDEX idx_creation ON bookmarks(creationDate);')
    db.run('CREATE INDEX idx_expiration ON bookmarks(expirationDate);')
    db.run('CREATE TABLE tags (tag TEXT UNIQUE PRIMARY KEY NOT NULL);')

// schema ready. empty database exists in memory.

    var result = exportSQLite(db)

    if (false === result)
        throw { name:'BookmarkException', msg:'failed to write to local storage' }
    if ('Object' === typeof result)
        throw result // something very bad happened

// database now written to local storage

    return db
} // createDB

function saveDB(db) {
    if (!simpleStorage.canUse())
        throw { name:'BookmarkException', msg:'local storage not an option' }

    var result = exportSQLite(db)

    if (false === result)
        throw { name:'BookmarkException', msg:'failed to write to local storage' }
    if ('Object' === typeof result)
        throw result // something very bad happened
// successfully written to local storage
} // saveDB

function restoreDB() {
    if (!simpleStorage.canUse())
        throw { name:'BookmarkException', msg:'local storage not an option' }

    var data = importLocalStorage()

    return ('undefined' === typeof data ? createDB() : new SQL.Database(data))
        /* return reference to SQLite database in memory */
}

function insertBookmark(db, bookmark) {
    var setColumns = function(bookmark) {
        var cols = 'url, creationDate' // required

        if (0 < bookmark.tags.length)
            cols += ', tags'
        if ('undefined' !== typeof bookmark.expirationDate &&
                   null !== bookmark.expirationDate)
            cols += ', expirationDate'

        return cols
    } // setColumns
    var setValues = function(bookmark) {
        var delimited_string = '\'_val_\''
        var vals = ''

        vals += delimited_string.replace('_val_', bookmark.url)
        vals += ', '
        vals += Date.now()
        if (0 < bookmark.tags.length) {
            vals += ', '
            vals += delimited_string.replace('_val_', bookmark.tags.toString())
        }
        if ('undefined' !== typeof bookmark.expirationDate &&
                   null !== bookmark.expirationDate) {
            vals += ', '
            vals += bookmark.expirationDate
        }
        return vals
    } // setValues
    var sql = 'INSERT INTO bookmarks(_cols_) VALUES(_vals_);'

    sql = sql.replace('_cols_', setColumns(bookmark))
    sql = sql.replace('_vals_', setValues(bookmark))
    console.log(sql)
    console.log(db.run(sql).exec('SELECT * FROM bookmarks ORDER BY creationDate'))
} // insertBookmark

function insertTag(db, name) {
    var delimited_string = '\'_val_\''
    var sql = 'INSERT INTO tags(tag) VALUES(_val_);'

    sql = sql.replace('_val_', delimited_string.replace('_val_', name))
    console.log(sql)
    try { console.log(db.run(sql).exec('SELECT * FROM tags ORDER BY tag')) }
    catch (ignored) { console.error(ignored) }
}

function queryTags(db) {
    var sql = 'SELECT * FROM tags ORDER BY tag;'
    var result = db.exec(sql)
    var tags = []
    var result

    console.log(sql)
    try { result = db.exec(sql) }
    catch(ignored) { console.error(ignored) }
    finally  {
        if ('undefined' !== typeof result[0]) tags = result[0].values
        return tags
    }
}

function queryBookmarks(db, options) {
    var sql = 'SELECT url, creationDate, expirationDate, tags \
FROM bookmarks _where_ _orderby_'
    var where = ''
    var orderBy = 'ORDER BY ' + options.orderBy

    if (0 < options.where.length) {
        where = 'WHERE tags LIKE \'%_pattern_%\''
        where = where.replace('_pattern_', options.where)
    }
    sql = sql.replace('_where_', where)
    sql = sql.replace('_orderby_', orderBy)

    var bookmarks = []
    var result

    console.log(sql)
    try { result = db.exec(sql) }
    catch(ignored) { console.error(ignored) }
    finally  {
        if ('undefined' !== typeof result[0]) bookmarks = result[0].values
        return bookmarks
    }
} // queryBookmarks

function deleteBookmark(db, url) {
    var sql = 'DELETE FROM bookmarks WHERE url=\'_url_\';'

    sql = sql.replace('_url_', url)
    console.log(sql)
    console.log(db.run(sql).exec('SELECT * FROM bookmarks ORDER BY creationDate'))
}

(function() {
    try {
        db = restoreDB()
    }
    catch(e) {
        console.error(e)
    }
    console.log('SQLite is ready.')
})()
