import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PetTypesService } from './pet-types.service.js';

@ApiTags('pet-types')
@Controller('pet-types')
export class PetTypesController {
  constructor(private readonly petTypes: PetTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all pet types (e.g. dog, cat, horse)' })
  async list() {
    return this.petTypes.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one pet type by id' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id') id: string) {
    const petType = await this.petTypes.getById(id);
    if (!petType) throw new NotFoundException(`No pet type with id ${id}`);
    return petType;
  }
}
