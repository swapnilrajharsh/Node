const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserDataSchema = new mongoose.Schema(
    {
        username: {type: String,
            required: true,
            unique: true},
        userId: {type: Schema.Types.ObjectId,
            ref: 'User',
            required: true},
        choicenumber: [ 
            {type: String, required: true} 
        ],
        geofence: [ 
            {type: String, required: true} 
        ]
    }, 
    { collection: 'userdata'}
)

const UserDatas = mongoose.model('UserDataSchema', UserDataSchema);


module.exports = UserDatas