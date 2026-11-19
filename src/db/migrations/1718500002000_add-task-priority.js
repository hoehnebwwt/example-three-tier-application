exports.up = (pgm) => {
  pgm.addColumn('tasks', {
    priority: {
      type: 'varchar(10)',
      notNull: true,
      default: 'medium',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('tasks', 'priority');
};
