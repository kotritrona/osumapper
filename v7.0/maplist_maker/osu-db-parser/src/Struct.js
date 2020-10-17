module.exports = {
    osuDbStruct: [
        {name: 'osuver', type: 'int32'},
        {name: 'folder_count', type: 'int32'},
        {name: 'is_locked', type: 'boolean'},
        {name: 'date_unlock_ticks', type: 'int64'},
        {name: 'username', type: 'string'},
        {name: 'beatmaps_count', type: 'int32'},
        {name: 'beatmaps', type: 'beatmaps', uses: 'osuver,beatmaps_count'},
        {name: 'userperms', type: 'int32'}
    ],
    collectionsStruct: [
        {name: 'osuver', type: 'int32'},
        {name: 'collectionscount', type: 'int32'},
        {name: 'collection', type: 'collections', uses: 'collectionscount'}
    ]
}