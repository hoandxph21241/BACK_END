class BaseMapper {
  /**
   * Model -> DTO
   */
  static toDto(entity) {
    return entity;
  }

  /**
   * Model[] -> DTO[]
   */
  static toDtos(entities = []) {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * Request -> Entity
   */
  static toEntity(data) {
    return data;
  }

  /**
   * Entity -> Simple Object
   * (bỏ __v, mongoose methods...)
   */
  static toObject(entity) {
    if (!entity) return null;

    return entity.toObject ? entity.toObject() : entity;
  }

  /**
   * Entity[] -> DTO[] + Pagination
   */
  static toPage(items = [], pagination = null) {
    return {
      items: this.toDtos(items),

      pagination,
    };
  }
}

module.exports = BaseMapper;
