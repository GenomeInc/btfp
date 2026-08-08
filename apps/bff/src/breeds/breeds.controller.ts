import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BreedsService } from './breeds.service.js';

@ApiTags('breeds')
@Controller('breeds')
export class BreedsController {
  constructor(private readonly breeds: BreedsService) {}

  @Get()
  @ApiOperation({ summary: 'List breeds, each tagged with its physical traits' })
  @ApiQuery({ name: 'petType', required: false, description: 'e.g. dog' })
  async list(@Query('petType') petType?: string) {
    return this.breeds.list(petType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one breed by id' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id') id: string) {
    const breed = await this.breeds.getById(id);
    if (!breed) throw new NotFoundException(`No breed with id ${id}`);
    return breed;
  }
}
