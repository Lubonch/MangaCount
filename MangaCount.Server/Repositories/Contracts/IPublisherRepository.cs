public interface IPublisherRepository
{
    IEnumerable<Publisher> GetAll();
    Publisher GetById(int id);
    Publisher Create(Publisher publisher);
    Publisher Update(Publisher publisher);
    void Delete(int id);
}