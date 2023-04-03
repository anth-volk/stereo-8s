'use strict';

const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class Cart extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
	  Cart.hasMany(Program);
	  Cart.belongsTo(User);
	  
    }
  }
  Cart.init({
    cart_id: {
		type: DataTypes.UUID,
		allowNull: false,
		unique: true
	},
    user_id: {
		type: DataTypes.UUID,
		allowNull: false
	},
    cart_name: {
		type: DataTypes.STRING,
		allowNull: false
	},
	program1_id: {
		type: DataTypes.UUID,
		allowNull: false,
		references: {
			model: {
				tableName: 'Programs'
			},
			key: 'program_id'
		}
	},
	program2_id: {
		type: DataTypes.UUID,
		allowNull: false,
		references: {
			model: {
				tableName: 'Programs'
			},
			key: 'program_id'
		}
	},
	program3_id: {
		type: DataTypes.UUID,
		allowNull: false,
		references: {
			model: {
				tableName: 'Programs'
			},
			key: 'program_id'
		}
	},
	program4_id: {
		type: DataTypes.UUID,
		allowNull: false,
		references: {
			model: {
				tableName: 'Programs'
			},
			key: 'program_id'
		}
	},
	program_length_seconds: DataTypes.BIGINT,
  }, {
    sequelize,
    modelName: 'Cart',
  });
  return Cart;
};