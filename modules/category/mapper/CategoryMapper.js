class CategoryMapper {
  static summary(category) {
    return {
      id: category._id,
      name: category.nameCategory,
      image: category.image,
    };
  }

  static detail(category) {
    return {
      id: category._id,
      name: category.nameCategory,
      image: category.image,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static list(categories) {
    return categories.map((category) =>
      this.summary(category)
    );
  }
}

module.exports = CategoryMapper;