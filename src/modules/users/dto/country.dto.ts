import { ApiProperty } from '@nestjs/swagger';

export class CountryDto {
  @ApiProperty({ example: 'FR', description: 'ISO 3166-1 alpha-2 country code' })
  code: string;

  @ApiProperty({ example: 'France', description: 'Country name in requested locale' })
  name: string;

  @ApiProperty({ example: 'France', description: 'Country name in English' })
  nameEn: string;

  @ApiProperty({ example: 'France', description: 'Country name in French' })
  nameFr: string;

  @ApiProperty({ example: true, description: 'Whether the country is available for registration' })
  isActive: boolean;

  @ApiProperty({ example: 'Western Europe', description: 'Geographic region' })
  region: string;
}

export class AvailableCountriesResponseDto {
  @ApiProperty({ type: [CountryDto], description: 'List of available countries' })
  countries: CountryDto[];
}
