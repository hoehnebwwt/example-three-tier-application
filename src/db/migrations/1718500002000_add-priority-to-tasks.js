exports.up = (pgm) => {
  pgm.addColumn('tasks', {
    priority: { type: 'varchar(20)', notNull: true, default: 'medium' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('tasks', 'priority');
};
