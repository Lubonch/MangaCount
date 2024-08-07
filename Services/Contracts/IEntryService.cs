﻿using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Repositories.Contracts;
using MangaCount.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCount.Services.Contracts
{
    public interface IEntryService
    {
        public List<Domain.Entry> GetAllEntries();
        public HttpResponseMessage ImportFromFile(String filePath);
        public Domain.Entry GetEntryById(int Id);
        public HttpResponseMessage SaveOrUpdate(DTO.EntryDTO entryDTO);
    }
}
