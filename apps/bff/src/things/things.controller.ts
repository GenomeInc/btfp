import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiParam, ApiTags } from '@nestjs/swagger';
import { ThingsService } from './things.service.js';
import { SearchService } from '../search/search.service.js';

@ApiTags('things')
@Controller('things')
export class ThingsController {
  constructor(
    private readonly things: ThingsService,
    private readonly search: SearchService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search or browse things dangerous to pets',
    description:
      'Combine q/petType/thingType freely. With no params, returns every Thing (~450+ and growing).',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Free-text fuzzy search' })
  @ApiQuery({ name: 'petType', required: false, description: 'e.g. dog, cat, horse' })
  @ApiQuery({ name: 'thingType', required: false, description: 'e.g. plant, food, medication, product, activity' })
  async list(
    @Query('q') q?: string,
    @Query('petType') petType?: string,
    @Query('thingType') thingType?: string,
  ) {
    if (q) return this.search.search(q, { petType, thingType });
    if (thingType) return this.things.listByThingType(thingType);
    if (petType) return this.search.filterByPetType(petType);
    return this.search.all();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one thing by id, including full details/source citation' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id') id: string) {
    const thing = await this.things.getById(id);
    if (!thing) throw new NotFoundException(`No thing with id ${id}`);
    return thing;
  }
}
