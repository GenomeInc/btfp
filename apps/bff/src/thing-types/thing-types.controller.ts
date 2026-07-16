import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ThingTypesService } from './thing-types.service.js';

@ApiTags('thing-types')
@Controller('thing-types')
export class ThingTypesController {
  constructor(private readonly thingTypes: ThingTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all thing types (e.g. plant, food, medication, product, activity)' })
  async list() {
    return this.thingTypes.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one thing type by id' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id') id: string) {
    const thingType = await this.thingTypes.getById(id);
    if (!thingType) throw new NotFoundException(`No thing type with id ${id}`);
    return thingType;
  }
}
